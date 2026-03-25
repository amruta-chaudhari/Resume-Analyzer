import OpenAI from 'openai';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { systemSettingsService } from './system-settings.service';
import type {
  AIModel,
  ModelCache,
  FormattingAnalysis,
  ModelParameters,
  AnalysisResult,
  CompletionParameters,
  OpenAICompletion,
  HealthCheckResponse,
} from '../types/index';

// Model cache with 24-hour expiration
let modelCache: ModelCache = {
    data: [],
    lastFetched: null,
    isLoading: false
};
let modelFetchPromise: Promise<AIModel[]> | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DEFAULT_MODEL = process.env.ANALYSIS_MODEL || 'openrouter/free';

const createDefaultModel = (): AIModel => ({
    id: DEFAULT_MODEL,
    name: 'OpenRouter Free',
    provider: 'OpenRouter',
    context_length: 128000,
    supported_parameters: ['temperature', 'max_tokens'],
    created: Math.floor(Date.now() / 1000),
    description: 'OpenRouter route that selects an available free model for the request.',
    recommended: true,
});

export class AIService {
    // Basic formatting analysis based on text patterns
    private analyzeFormattingIssues(text: string): FormattingAnalysis {
        const detectedIssues: string[] = [];
        const formattingHints: string[] = [];

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Check for contact information placement
        const firstLines = lines.slice(0, 5).join(' ').toLowerCase();
        const hasEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(firstLines);
        const hasPhone = /(\(\d{3}\)\s*\d{3}[-\s]\d{4}|\d{3}[-\s]\d{3}[-\s]\d{4}|\d{10})/.test(firstLines);

        if (!hasEmail && !hasPhone) {
            detectedIssues.push('Contact information may not be prominently placed at the top');
            formattingHints.push('Place your email and phone number at the very top of your resume');
        }

        // Check for section headers
        const commonSections = ['experience', 'education', 'skills', 'projects', 'certifications', 'achievements'];
        const uppercaseLines = lines.filter(line => line === line.toUpperCase() && line.length > 2 && line.length < 30);
        const foundSections = commonSections.filter(section =>
            lines.some(line => line.toLowerCase().includes(section))
        );

        if (foundSections.length < 2) {
            detectedIssues.push('Limited standard section headers detected');
            formattingHints.push('Use clear section headers like EXPERIENCE, EDUCATION, SKILLS in ALL CAPS or bold');
        }

        // Check for excessive special characters
        const specialCharCount = (text.match(/[^\w\s.,-]/g) || []).length;
        const textLength = text.replace(/\s/g, '').length;
        const specialCharRatio = specialCharCount / textLength;

        if (specialCharRatio > 0.05) {
            detectedIssues.push('High use of special characters that may confuse ATS');
            formattingHints.push('Use standard bullet points (•) and avoid excessive symbols or graphics');
        }

        // Check for consistent date formatting
        const datePatterns = [
            /\b\d{1,2}\/\d{4}\b/g,  // MM/YYYY
            /\b\d{4}-\d{1,2}\b/g,   // YYYY-MM
            /\b\w{3}\s+\d{4}\b/g,  // Mon YYYY
        ];

        const dateMatches = datePatterns.map(pattern => (text.match(pattern) || []).length);
        const totalDates = dateMatches.reduce((a, b) => a + b, 0);
        const inconsistentDates = dateMatches.filter(count => count > 0).length > 1;

        if (totalDates > 0 && inconsistentDates) {
            detectedIssues.push('Inconsistent date formatting throughout resume');
            formattingHints.push('Use consistent date format like MM/YYYY throughout your resume');
        }

        // Check for reasonable length
        if (lines.length > 100) {
            detectedIssues.push('Resume appears very long, which may affect ATS parsing');
            formattingHints.push('Keep resume to 1-2 pages for better ATS compatibility');
        }

        // Check for tables or columns (indicated by multiple spaces or tabs)
        const tableIndicators = lines.filter(line => line.includes('\t') || line.split(/\s{4,}/).length > 3);
        if (tableIndicators.length > 2) {
            detectedIssues.push('Possible use of tables or complex columns detected');
            formattingHints.push('Avoid tables and columns - use simple linear formatting');
        }

        return { detectedIssues, formattingHints };
    }
    async getAvailableModels(): Promise<AIModel[]> {
        const now = Date.now();

        // Return cached data if still valid
        if (modelCache.data.length > 0 &&
            modelCache.lastFetched &&
            (now - modelCache.lastFetched) < CACHE_DURATION) {
            return modelCache.data;
        }

        // Prevent multiple simultaneous requests
        if (modelFetchPromise) {
            return modelFetchPromise;
        }

        modelCache.isLoading = true;

        modelFetchPromise = (async () => {
            try {
                const settings = await systemSettingsService.getSettings();
                const provider = settings.activeAiProvider || 'openrouter';

                if (provider === 'anthropic') {
                    const apiKey = settings.anthropicKey || process.env.ANTHROPIC_API_KEY || '';
                    if (!apiKey) throw new Error('Anthropic API key not configured');
                    
                    try {
                        const response = await axios.get('https://api.anthropic.com/v1/models', {
                            headers: {
                                'x-api-key': apiKey,
                                'anthropic-version': '2023-06-01'
                            }
                        });
                        
                        const fetchedModels: AIModel[] = response.data.data.map((m: any) => ({
                            id: m.id,
                            name: m.display_name || m.id,
                            provider: 'Anthropic',
                            context_length: m.id.includes('3.5') ? 200000 : 200000,
                            supported_parameters: ['temperature', 'max_tokens'],
                            created: m.created_at ? Math.floor(new Date(m.created_at).getTime() / 1000) : Math.floor(now/1000),
                            description: `Anthropic ${m.id} model`,
                            recommended: m.id.includes('haiku')
                        }));
                        
                        modelCache.data = fetchedModels.length > 0 ? fetchedModels : [];
                    } catch (error) {
                        console.error('Failed to fetch Anthropic models via API. Falling back to default list.', error);
                        // Fallback list
                        modelCache.data = [{
                            id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic',
                            context_length: 200000, supported_parameters: ['temperature', 'max_tokens'],
                            created: Math.floor(now/1000), description: 'Fast and cost-effective', recommended: true
                        }, {
                            id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'Anthropic',
                            context_length: 200000, supported_parameters: ['temperature', 'max_tokens'],
                            created: Math.floor(now/1000), description: 'Most intelligent model'
                        }];
                    }
                    
                    modelCache.lastFetched = Date.now();
                    return modelCache.data;
                } else if (provider === 'gemini') {
                    const apiKey = settings.geminiKey || process.env.GEMINI_API_KEY || '';
                    if (!apiKey) throw new Error('Gemini API key not configured');
                    
                    try {
                        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                        const fetchedModels: AIModel[] = response.data.models
                            .filter((m: any) => m.name.includes('gemini'))
                            .map((m: any) => ({
                                id: m.name.replace('models/', ''),
                                name: m.displayName || m.name.replace('models/', ''),
                                provider: 'Google',
                                context_length: m.inputTokenLimit || 1048576,
                                supported_parameters: ['temperature', 'max_tokens'],
                                created: Math.floor(now/1000),
                                description: m.description || 'Google Gemini Model',
                                recommended: m.name.includes('flash')
                            }));
                            
                        modelCache.data = fetchedModels.length > 0 ? fetchedModels : [];
                    } catch (error) {
                        console.error('Failed to fetch Gemini models via API. Falling back to default list.', error);
                        modelCache.data = [{
                            id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google',
                            context_length: 1048576, supported_parameters: ['temperature', 'max_tokens'],
                            created: Math.floor(now/1000), description: 'Fast and versatile', recommended: true
                        }, {
                            id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google',
                            context_length: 2097152, supported_parameters: ['temperature', 'max_tokens'],
                            created: Math.floor(now/1000), description: 'Most capable model'
                        }];
                    }
                    
                    modelCache.lastFetched = Date.now();
                    return modelCache.data;
                } else if (provider === 'openai') {
                    const apiKey = settings.openAiKey || process.env.OPENAI_API_KEY || '';
                    if (!apiKey) throw new Error('OpenAI API key not configured');
                    
                    try {
                        const openai = new OpenAI({ apiKey });
                        const response = await openai.models.list();
                        
                        const fetchedModels: AIModel[] = response.data
                            .filter((m: any) => m.id.includes('gpt'))
                            .map((m: any) => ({
                                id: m.id,
                                name: m.id,
                                provider: 'OpenAI',
                                context_length: m.id.includes('4') || m.id.includes('o1') ? 128000 : 16385,
                                supported_parameters: ['temperature', 'max_tokens'],
                                created: m.created || Math.floor(now/1000),
                                description: `OpenAI ${m.id} model`,
                                recommended: m.id.includes('gpt-4o-mini') || m.id.includes('gpt-3.5-turbo')
                            }));
                            
                        modelCache.data = fetchedModels.length > 0 ? fetchedModels : [];
                    } catch (error) {
                        console.error('Failed to fetch OpenAI models via API. Falling back to default list.', error);
                        modelCache.data = [{
                            id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI',
                            context_length: 16385, supported_parameters: ['temperature', 'max_tokens'],
                            created: Math.floor(now/1000), description: 'Standard capable model', recommended: true
                        }, {
                             id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI',
                             context_length: 128000, supported_parameters: ['temperature', 'max_tokens'],
                             created: Math.floor(now/1000), description: 'Most advanced model'
                        }];
                    }
                    
                    modelCache.lastFetched = Date.now();
                    return modelCache.data;
                }

                // Default OpenRouter behavior
                const response = await axios.get('https://openrouter.ai/api/v1/models');

                // Filter and format models
                const fetchedModels: AIModel[] = response.data.data
                    .filter((model: AIModel) => model.id.includes('free') || model.pricing?.prompt === '0')
                    .map((model: AIModel) => ({
                        id: model.id,
                        name: model.name || model.id,
                        provider: model.id.split('/')[0],
                        context_length: model.context_length || 4096,
                        supported_parameters: model.supported_parameters || [],
                        per_request_limits: model.per_request_limits,
                        pricing: model.pricing,
                        created: model.created,
                        description: model.description || '',
                        architecture: model.architecture,
                        recommended: model.id === DEFAULT_MODEL,
                    }));

                const models = fetchedModels.some((model) => model.id === DEFAULT_MODEL)
                    ? fetchedModels
                    : [createDefaultModel(), ...fetchedModels];

                modelCache.data = models;
                modelCache.lastFetched = Date.now();

                return models;
            } catch (error) {
                console.error('Error fetching models:', error);
                // Return cached data if available, even if expired
                if (modelCache.data.length > 0) {
                    return modelCache.data;
                }
                throw error;
            } finally {
                modelCache.isLoading = false;
                modelFetchPromise = null;
            }
        })();

        return modelFetchPromise;
    }

    async refreshModelsCache(): Promise<AIModel[]> {
        modelCache.data = [];
        modelCache.lastFetched = null;
        return this.getAvailableModels();
    }

    // Method for testing - clears the module-level cache
    clearCache(): void {
        modelCache.data = [];
        modelCache.lastFetched = null;
        modelCache.isLoading = false;
    }

    async analyzeResume(
        text: string, 
        jobDescription: string, 
        selectedModel?: string,
        modelParameters?: ModelParameters
    ): Promise<AnalysisResult> {
        // Pre-analyze formatting issues
        const formattingAnalysis = this.analyzeFormattingIssues(text);

        const prompt = `You are an expert ATS (Applicant Tracking System) analyzer, specializing in providing feedback for university students in technical fields. Analyze the following resume against the job description and provide a detailed assessment based on career advising best practices.


Resume Text:
${text}


Job Description:
${jobDescription}


Additional Formatting Analysis:
${formattingAnalysis.detectedIssues.length > 0 ? 
    `Pre-detected potential formatting issues: ${formattingAnalysis.detectedIssues.join(', ')}` : 
    'No obvious formatting issues detected in initial text analysis.'}

Please provide a comprehensive analysis in the following JSON format:
{
  "overallScore": <number 0-100>,
  "skillsAnalysis": {
    "score": <number 0-100>,
    "matchedKeywords": [<array of matched keywords from the job description>],
    "missingKeywords": [<array of important missing keywords>],
    "recommendations": [<array of suggestions for the skills section>]
  },
  "formattingScore": {
    "score": <number 0-100>,
    "issues": [<array of specific formatting issues found>],
    "suggestions": [<array of concrete suggestions for how to fix the issues>]
  },
  "experienceRelevance": {
    "score": <number 0-100>,
    "relevantExperience": <string describing how the candidate's experience aligns with the role>,
    "gaps": [<array of experience gaps>]
  },
  "actionableAdvice": [<array of specific, actionable recommendations for the candidate>],
  "modelUsed": {
    "id": "<model used>",
    "name": "<model display name>",
    "provider": "<provider name>"
  }
}


Focus on these rules:
1.  **Skills and Keyword Optimization**: In the skillsAnalysis, identify keywords. In the recommendations for that section, check if there is a "Technical Skills" section. If there is also a general "Skills" section, recommend combining them into a single, well-organized "Technical Skills" section as per university guidelines.

2.  **Quantify Achievements Carefully**: When providing advice in actionableAdvice to quantify results (e.g., "improved speed by X%"), you MUST include the following stipulation: **"Only add metrics if they are accurate and you can explain how you arrived at the number. Do not invent data, as this can be problematic in the hiring process."**

3.  **Summary/Objective Statements**: In actionableAdvice, check for a "Summary" or "Objective" section. If the resume appears to be for an undergraduate student, recommend removing it to keep the resume to a single page, which is standard practice.

4.  **ATS Formatting Analysis**: For the formattingScore, analyze the resume text for ATS compatibility using these specific criteria:

    **Critical ATS Issues (Major Score Deductions - 10-20 points each):**
    - **File Format Problems**: Resume saved in unsupported formats (images, complex PDFs, scanned documents)
    - **Complex Layout Elements**: Use of tables, columns, graphics, images, or text boxes that confuse ATS parsing
    - **Non-standard Fonts**: Use of decorative or non-standard fonts that may not parse correctly
    - **Inconsistent Formatting**: Mixed fonts, sizes, or styles within sections
    - **Missing Section Headers**: Lack of clear, standard section headers (Experience, Education, Skills, etc.)
    - **Contact Information Issues**: Email, phone, or LinkedIn not at the top, or formatted in ways that confuse ATS

    **Moderate ATS Issues (Medium Score Deductions - 5-10 points each):**
    - **Spacing Problems**: Inconsistent spacing, unusual line breaks, or formatting that creates parsing issues
    - **Special Characters**: Excessive use of symbols, bullets, or special characters that may not parse correctly
    - **Abbreviations**: Uncommon abbreviations that ATS might not recognize
    - **Date Format Inconsistencies**: Different date formats throughout the resume
    - **Section Organization**: Non-standard section ordering that confuses automated parsing

    **Minor ATS Issues (Small Score Deductions - 1-5 points each):**
    - **Font Size Variations**: Slight inconsistencies in font sizes
    - **Capitalization Issues**: Inconsistent capitalization in section headers
    - **Length Concerns**: Resume too long for ATS parsing (over 2 pages for entry-level)

    **ATS Best Practices to Check:**
    - Clean, simple layout with standard fonts (Arial, Calibri, Times New Roman, 10-12pt)
    - Clear section headers in bold or ALL CAPS
    - Consistent date formatting (MM/YYYY preferred)
    - Standard bullet points (• or -)
    - No graphics, tables, or columns
    - Contact info at the top
    - Keywords naturally integrated, not keyword-stuffed
    - PDF format preferred for submission

    **Scoring Guidelines:**
    - 90-100: Excellent ATS formatting, minimal issues
    - 70-89: Good formatting with some minor issues
    - 50-69: Moderate formatting issues that need attention
    - 30-49: Significant formatting problems affecting ATS parsing
    - 0-29: Major formatting issues that will likely cause ATS rejection

    For each issue identified, provide a specific, actionable suggestion for how to fix it. Be thorough in analyzing the text for these formatting indicators.

5.  **Experience Relevance**: Analyze how the candidate's experience connects to the job description, highlighting both strengths and areas that are not covered.

6.  **Overall Score**: The overallScore should reflect the resume's overall ATS compatibility and readiness for the application.

Be thorough but concise. Provide specific examples and actionable advice based on the rules above. Keep formatting exactly as JSON.
`;

        try {
            const settings = await systemSettingsService.getSettings();
            const provider = settings.activeAiProvider || 'openrouter';
            let responseText = '';
            let finalModel = selectedModel || 'default';

            if (provider === 'anthropic') {
                finalModel = selectedModel || 'claude-3-haiku-20240307';
                const anthropic = new Anthropic({ apiKey: settings.anthropicKey || process.env.ANTHROPIC_API_KEY || '' });
                const completion = await anthropic.messages.create({
                    model: finalModel,
                    max_tokens: Math.min(modelParameters?.max_tokens ?? 4000, 4096),
                    temperature: modelParameters?.temperature ?? 0.15,
                    messages: [{ role: 'user', content: prompt }]
                });
                responseText = completion.content[0].type === 'text' ? completion.content[0].text : '';
            } else if (provider === 'gemini') {
                finalModel = selectedModel || 'gemini-1.5-flash';
                const genAI = new GoogleGenerativeAI(settings.geminiKey || process.env.GEMINI_API_KEY || '');
                const genModel = genAI.getGenerativeModel({ model: finalModel });
                const result = await genModel.generateContent(prompt);
                responseText = result.response.text();
            } else if (provider === 'openai') {
                finalModel = selectedModel || 'gpt-3.5-turbo';
                const openai = new OpenAI({ apiKey: settings.openAiKey || process.env.OPENAI_API_KEY || '' });
                const completion = await openai.chat.completions.create({
                    model: finalModel,
                    temperature: modelParameters?.temperature ?? 0.15,
                    max_tokens: Math.min(modelParameters?.max_tokens ?? 4000, 4096),
                    messages: [{ role: 'user', content: prompt }]
                });
                responseText = completion.choices[0]?.message?.content || '';
            } else {
                // OpenRouter
                finalModel = selectedModel || DEFAULT_MODEL;
                const openrouter = new OpenAI({
                    apiKey: settings.openRouterKey || process.env.OPENROUTER_API_KEY || '',
                    baseURL: 'https://openrouter.ai/api/v1',
                });
                const completionParams: CompletionParameters = {
                    model: finalModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: modelParameters?.temperature ?? 0.15,
                    max_tokens: Math.min(modelParameters?.max_tokens ?? 4000, 16000),
                    seed: 42,
                };
                if (modelParameters?.include_reasoning) {
                    completionParams.reasoning_effort = 'medium';
                }
                const completion = await openrouter.chat.completions.create(completionParams as any);
                responseText = (completion as OpenAICompletion).choices[0]?.message?.content || '';
            }

            if (!responseText) {
                throw new Error('No response from AI model');
            }

            // Extract JSON from markdown code blocks if present
            let jsonString = responseText.trim();
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonString.startsWith('```')) {
                jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parse the JSON response
            const analysisResult = JSON.parse(jsonString) as AnalysisResult;

            // Ensure the response has the expected structure
            if (analysisResult.overallScore == null || !analysisResult.skillsAnalysis || !analysisResult.formattingScore) {
                throw new Error('Invalid response format from AI model');
            }
            
            // Set the model used metadata
            analysisResult.modelUsed = {
                id: finalModel,
                name: finalModel,
                provider: provider
            };

            return analysisResult;

        } catch (error) {
            console.error('AI Analysis error:', error);
            const status = typeof error === 'object' && error !== null && 'status' in error
                ? Number((error as { status?: number }).status)
                : undefined;

            if (status === 401 || status === 403) {
                throw new Error('AI provider authentication failed. Check API Keys and provider access.');
            }

            if (status === 429) {
                throw new Error('AI provider rate limit reached. Please retry shortly.');
            }

            throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async checkHealth(): Promise<HealthCheckResponse> {
        try {
            const settings = await systemSettingsService.getSettings();
            if (settings.activeAiProvider !== 'openrouter') {
                return { status: 'healthy', openrouter: true, models: 1 };
            }

            // Test OpenRouter API connectivity
            const response = await axios.get('https://openrouter.ai/api/v1/models');
            return {
                status: 'healthy',
                openrouter: true,
                models: response.data.data?.length || 0
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                openrouter: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
