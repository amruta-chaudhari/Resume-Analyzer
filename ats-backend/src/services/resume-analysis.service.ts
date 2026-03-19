/**
 * Resume Analysis Service
 * Handles AI-powered parsing and analysis of resume content
 */

import { safeJsonParse } from '../lib/json';

export class ResumeAnalysisService {
  /**
   * Parses resume text using AI to extract structured data
   * @param text - Resume text to parse
   * @param userId - User ID (for tracking)
   * @returns Structured resume data as parsed by AI
   * @throws Error if parsing fails or AI service is unavailable
   */
  async parseResumeWithAI(text: string, userId: string) {
    // Use OpenRouter configuration like the existing AI service
    const OpenAI = require('openai');

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.BASE_URL || 'https://openrouter.ai/api/v1',
    });

    const model = process.env.ANALYSIS_MODEL || 'google/gemini-2.0-flash-exp:free';

    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `Parse the following resume text into a structured JSON format. Extract the following sections:
            - personalInfo: { fullName, email, phone, location, linkedin, website }
            - summary: professional summary text
            - experience: array of { title, company, location, startDate, endDate, description, achievements }
            - education: array of { degree, institution, location, graduationDate, gpa }
            - skills: array of skill strings
            - certifications: array of { name, issuer, date, expiryDate }
            - projects: array of { name, description, technologies, url }

            Return only valid JSON, no markdown or explanations.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const responseContent = completion.choices[0].message.content;

      if (!responseContent) {
        throw new Error('AI response was empty');
      }

      // Clean the response - remove any markdown formatting
      const cleanedContent = responseContent.replace(/```json\s*|\s*```/g, '').trim();

      const parsedContent = safeJsonParse<Record<string, any> | null>(cleanedContent, null);
      if (!parsedContent) {
        throw new Error('Failed to parse structured response from AI');
      }

      return parsedContent;
    } catch (error: any) {
      throw new Error('Failed to parse resume with AI');
    }
  }

  /**
   * Extracts readable text from structured resume data
   * Used to convert structured data back to plain text format
   * @param data - Structured resume data object
   * @returns Plain text representation of the resume
   */
  extractTextFromStructuredData(data: any): string {
    // Extract readable text from structured resume data
    const sections: string[] = [];

    if (data.personalInfo) {
      const { fullName, email, phone, location } = data.personalInfo;
      sections.push(`${fullName || 'Name'}`);
      if (email) sections.push(`Email: ${email}`);
      if (phone) sections.push(`Phone: ${phone}`);
      if (location) sections.push(`Location: ${location}`);
    }

    if (data.summary) {
      sections.push(`SUMMARY\n${data.summary}`);
    }

    if (data.experience && Array.isArray(data.experience)) {
      sections.push('EXPERIENCE');
      data.experience.forEach((exp: any) => {
        sections.push(`${exp.position || 'Position'} at ${exp.company || 'Company'}`);
        sections.push(`${exp.startDate || 'Start'} - ${exp.endDate || 'Present'}`);
        if (exp.description) sections.push(exp.description);
      });
    }

    if (data.education && Array.isArray(data.education)) {
      sections.push('EDUCATION');
      data.education.forEach((edu: any) => {
        sections.push(`${edu.degree || 'Degree'} from ${edu.school || 'School'}`);
        if (edu.graduationDate) sections.push(`Graduated: ${edu.graduationDate}`);
      });
    }

    if (data.skills && Array.isArray(data.skills)) {
      sections.push(`SKILLS\n${data.skills.join(', ')}`);
    }

    return sections.join('\n\n');
  }
}
