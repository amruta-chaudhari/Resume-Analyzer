import type { FormattingScore } from '../types';

type KeywordMatch = {
  allKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  coverage: number;
  score: number;
  recommendations: string[];
};

type ExperienceEvaluation = {
  score: number;
  gaps: string[];
  matchedKeywordCoverage: number;
  hasQuantifiedAchievements: boolean;
  hasClearDateRanges: boolean;
  hasExperienceSection: boolean;
};

export type DeterministicAtsScorecard = {
  skillsAnalysis: KeywordMatch;
  formattingScore: FormattingScore;
  experienceRelevance: ExperienceEvaluation;
  overallScore: number;
  analysisWarnings: string[];
  scoringBreakdown: {
    skills: number;
    experience: number;
    formatting: number;
    weights: {
      skills: number;
      experience: number;
      formatting: number;
    };
    keywordCoverage: number;
    experienceKeywordCoverage: number;
  };
};

const TECH_PHRASE_REGEX =
  /\b(?:machine learning|artificial intelligence|data analysis|data visualization|project management|product management|cloud computing|software development|web development|full stack|front end|back end|computer vision|natural language processing|test automation|continuous integration|continuous deployment|version control|object oriented programming|database design)\b/gi;

const EXPLICIT_KEYWORD_SEGMENT_REGEX =
  /(?:experience with|experienced with|proficient in|knowledge of|expertise in|familiarity with|skills? in|technologies?:|tools?:|stack:|requirements?:|must have|nice to have|preferred:)([^\n.;]+)/gi;

const TOKEN_REGEX = /[A-Za-z][A-Za-z0-9.+#/-]{1,24}/g;
const MONTH_PATTERN = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_TOKEN_SOURCE = `${MONTH_PATTERN}\\s+\\d{4}|\\d{1,2}[/-]\\d{2,4}|\\d{4}[/-]\\d{1,2}|\\b\\d{4}\\b|present|current|now`;
const DATE_RANGE_REGEX = new RegExp(`(${DATE_TOKEN_SOURCE})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN_SOURCE})`, 'gi');

const SECTION_HEADERS = [
  'experience',
  'work experience',
  'professional experience',
  'education',
  'skills',
  'technical skills',
  'projects',
  'certifications',
  'summary',
  'objective',
];

const KEYWORD_STOPWORDS = new Set([
  'ability',
  'about',
  'above',
  'across',
  'after',
  'along',
  'also',
  'an',
  'and',
  'any',
  'applicant',
  'application',
  'are',
  'as',
  'at',
  'be',
  'best',
  'both',
  'by',
  'candidate',
  'candidates',
  'clear',
  'collaboration',
  'collaborative',
  'communicate',
  'communication',
  'company',
  'coordinate',
  'create',
  'customer',
  'demonstrated',
  'design',
  'detail',
  'driven',
  'environment',
  'excellent',
  'experience',
  'familiarity',
  'for',
  'from',
  'good',
  'have',
  'help',
  'high',
  'ideal',
  'in',
  'including',
  'into',
  'is',
  'it',
  'job',
  'knowledge',
  'looking',
  'maintain',
  'management',
  'member',
  'must',
  'nice',
  'of',
  'on',
  'or',
  'our',
  'partner',
  'preferred',
  'problem',
  'problems',
  'process',
  'product',
  'quality',
  'requirements',
  'responsible',
  'role',
  'self',
  'skills',
  'software',
  'solutions',
  'strong',
  'student',
  'support',
  'team',
  'teams',
  'that',
  'the',
  'their',
  'they',
  'this',
  'to',
  'tools',
  'using',
  'we',
  'well',
  'with',
  'within',
  'work',
  'working',
  'years',
  'year',
  'you',
  'your',
]);

const SYNONYM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bjavascript\b/gi, 'js'],
  [/\btypescript\b/gi, 'ts'],
  [/\bnode\.js\b/gi, 'nodejs'],
  [/\breact\.js\b/gi, 'react'],
  [/\bnext\.js\b/gi, 'nextjs'],
  [/\bamazon web services\b/gi, 'aws'],
  [/\bgoogle cloud platform\b/gi, 'gcp'],
  [/\bartificial intelligence\b/gi, 'ai'],
  [/\bmachine learning\b/gi, 'ml'],
  [/\bstructured query language\b/gi, 'sql'],
  [/\bcontinuous integration\b/gi, 'ci'],
  [/\bcontinuous deployment\b/gi, 'cd'],
  [/\bfront end\b/gi, 'frontend'],
  [/\bback end\b/gi, 'backend'],
  [/\bfull stack\b/gi, 'fullstack'],
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const normalizeForMatching = (input: string): string => {
  let normalized = (input || '').toLowerCase();

  for (const [pattern, replacement] of SYNONYM_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/[^a-z0-9+#./\-\s]/g, ' ')
    .replace(/[\/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const dedupeStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const classifyDateStyle = (raw: string): string => {
  if (/^(?:present|current|now)$/i.test(raw)) {
    return 'present';
  }
  if (new RegExp(`^${MONTH_PATTERN}\\s+\\d{4}$`, 'i').test(raw)) {
    return /^[A-Z][a-z]{3,9}\s+\d{4}$/.test(raw) ? 'MMMM YYYY' : 'MMM YYYY';
  }
  if (/^\d{1,2}\/\d{4}$/.test(raw)) {
    return 'MM/YYYY';
  }
  if (/^\d{1,2}-\d{4}$/.test(raw)) {
    return 'MM-YYYY';
  }
  if (/^\d{4}-\d{1,2}$/.test(raw)) {
    return 'YYYY-MM';
  }
  if (/^\d{4}$/.test(raw)) {
    return 'YYYY';
  }
  return 'unknown';
};

const parseDateToken = (rawValue: string): { year: number | null; month: number | null; isPresent: boolean; style: string } | null => {
  const raw = rawValue.trim();
  if (!raw) {
    return null;
  }

  if (/^(present|current|now)$/i.test(raw)) {
    return {
      year: null,
      month: null,
      isPresent: true,
      style: 'present',
    };
  }

  const monthMap: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  let match = raw.match(new RegExp(`^(${MONTH_PATTERN})\\s+(\\d{4})$`, 'i'));
  if (match) {
    return {
      year: Number(match[2]),
      month: monthMap[match[1].toLowerCase()] || null,
      isPresent: false,
      style: classifyDateStyle(raw),
    };
  }

  match = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) {
    return {
      year: Number(match[2]),
      month: Number(match[1]),
      isPresent: false,
      style: 'MM/YYYY',
    };
  }

  match = raw.match(/^(\d{1,2})-(\d{4})$/);
  if (match) {
    return {
      year: Number(match[2]),
      month: Number(match[1]),
      isPresent: false,
      style: 'MM-YYYY',
    };
  }

  match = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      isPresent: false,
      style: 'YYYY-MM',
    };
  }

  match = raw.match(/^(\d{4})$/);
  if (match) {
    return {
      year: Number(match[1]),
      month: 1,
      isPresent: false,
      style: 'YYYY',
    };
  }

  return null;
};

const toComparableDateValue = (parsed: { year: number | null; month: number | null; isPresent: boolean }) => {
  if (parsed.isPresent) {
    return Number.POSITIVE_INFINITY;
  }

  if (parsed.year == null) {
    return null;
  }

  return parsed.year * 12 + (parsed.month || 1);
};

const buildRecommendationsFromMissingKeywords = (missingKeywords: string[]) => {
  if (missingKeywords.length === 0) {
    return ['Keep your Technical Skills section aligned to the strongest job keywords already present.'];
  }

  return missingKeywords.slice(0, 4).map(
    (keyword) => `Add concrete evidence for ${keyword} in your Technical Skills or Experience section if you have real hands-on exposure.`
  );
};

const hasWholePhraseMatch = (normalizedText: string, rawKeyword: string): boolean => {
  const normalizedKeyword = normalizeForMatching(rawKeyword);
  if (!normalizedKeyword) {
    return false;
  }

  const matcher = new RegExp(`(^|\\s)${escapeRegExp(normalizedKeyword)}(?=\\s|$)`, 'i');
  return matcher.test(` ${normalizedText} `);
};

const extractKeywords = (jobDescription: string): string[] => {
  const candidates: string[] = [];
  const source = jobDescription || '';

  for (const match of source.matchAll(EXPLICIT_KEYWORD_SEGMENT_REGEX)) {
    const segment = match[1] || '';
    segment
      .split(/,|\/|\|| and | or /i)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => candidates.push(item));
  }

  for (const match of source.matchAll(TECH_PHRASE_REGEX)) {
    if (match[0]) {
      candidates.push(match[0].trim());
    }
  }

  for (const match of source.matchAll(TOKEN_REGEX)) {
    const token = match[0].trim();
    const normalized = normalizeForMatching(token);
    if (!normalized || normalized.length < 2 || KEYWORD_STOPWORDS.has(normalized)) {
      continue;
    }
    if (/[A-Z]/.test(token) || /[+#./]/.test(token) || token.length >= 4) {
      candidates.push(token);
    }
  }

  const deduped = new Map<string, string>();
  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const normalized = normalizeForMatching(cleaned);
    if (!normalized || normalized.length < 2 || KEYWORD_STOPWORDS.has(normalized)) {
      continue;
    }
    if (!deduped.has(normalized)) {
      deduped.set(normalized, cleaned);
    }
  }

  return Array.from(deduped.values()).slice(0, 18);
};

const evaluateKeywordMatch = (resumeText: string, jobDescription: string): KeywordMatch => {
  const allKeywords = extractKeywords(jobDescription);
  const normalizedResume = normalizeForMatching(resumeText);

  if (allKeywords.length === 0) {
    return {
      allKeywords: [],
      matchedKeywords: [],
      missingKeywords: [],
      coverage: 0,
      score: 60,
      recommendations: ['Add the job-specific tools, technologies, and platform keywords that match your real experience.'],
    };
  }

  const matchedKeywords = allKeywords.filter((keyword) => hasWholePhraseMatch(normalizedResume, keyword));
  const missingKeywords = allKeywords.filter((keyword) => !matchedKeywords.includes(keyword));
  const coverage = matchedKeywords.length / allKeywords.length;

  return {
    allKeywords,
    matchedKeywords,
    missingKeywords,
    coverage,
    score: clampScore(20 + (coverage * 80)),
    recommendations: buildRecommendationsFromMissingKeywords(missingKeywords),
  };
};

const getSectionLines = (resumeText: string, sectionKeywords: string[]) => {
  const lines = resumeText.split('\n').map((line) => line.trim());
  const normalizedKeywords = sectionKeywords.map((keyword) => keyword.toLowerCase());
  let startIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const normalizedLine = lines[index].toLowerCase();
    if (normalizedKeywords.some((keyword) => normalizedLine === keyword || normalizedLine.startsWith(`${keyword} `))) {
      startIndex = index + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return [] as string[];
  }

  const collected: string[] = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const normalizedLine = line.toLowerCase();
    if (
      line &&
      normalizedLine.length < 40 &&
      SECTION_HEADERS.some((header) => normalizedLine === header || normalizedLine.startsWith(`${header} `))
    ) {
      break;
    }
    if (line) {
      collected.push(line);
    }
  }

  return collected;
};

const evaluateExperienceRelevance = (
  resumeText: string,
  keywordMatch: KeywordMatch
): ExperienceEvaluation => {
  const experienceLines = getSectionLines(resumeText, ['experience', 'work experience', 'professional experience']);
  const experienceText = experienceLines.join('\n');
  const textForMatching = normalizeForMatching(experienceText || resumeText);
  const matchedInExperience = keywordMatch.matchedKeywords.filter((keyword) => hasWholePhraseMatch(textForMatching, keyword));
  const matchedKeywordCoverage = keywordMatch.allKeywords.length > 0
    ? matchedInExperience.length / keywordMatch.allKeywords.length
    : 0;

  const hasQuantifiedAchievements = /(\d+%|\$\s?\d|\b\d+\+?\s+(?:users|customers|clients|projects|features|engineers|students|members|deployments|tickets|hours|days|weeks|months|years)\b)/i
    .test(experienceText || resumeText);

  const dateRanges = Array.from((resumeText || '').matchAll(DATE_RANGE_REGEX));
  const hasClearDateRanges = dateRanges.length > 0;
  const hasExperienceSection = experienceLines.length > 0;

  const gaps: string[] = [];
  if (!hasExperienceSection) {
    gaps.push('No clear EXPERIENCE section detected for ATS parsing.');
  }
  if (!hasQuantifiedAchievements) {
    gaps.push('Add quantified outcomes to experience bullets so recruiters can measure impact quickly.');
  }
  if (!hasClearDateRanges) {
    gaps.push('Use clear date ranges for each role so ATS systems can understand your timeline.');
  }
  if (keywordMatch.missingKeywords.length > 0) {
    gaps.push(`Add or highlight experience related to ${keywordMatch.missingKeywords.slice(0, 3).join(', ')} if you have relevant exposure.`);
  }

  let score = 25 + (matchedKeywordCoverage * 55);
  if (hasQuantifiedAchievements) {
    score += 10;
  }
  if (hasClearDateRanges) {
    score += 10;
  }
  if (hasExperienceSection) {
    score += 5;
  }

  if (!hasExperienceSection) {
    score = Math.min(score, 45);
  }

  return {
    score: clampScore(score),
    gaps: dedupeStrings(gaps).slice(0, 4),
    matchedKeywordCoverage,
    hasQuantifiedAchievements,
    hasClearDateRanges,
    hasExperienceSection,
  };
};

const buildFormattingScore = (resumeText: string): FormattingScore & { warnings: string[] } => {
  const detectedIssues: string[] = [];
  const suggestions: string[] = [];
  const warnings: string[] = [];
  let deductionTotal = 0;

  const addIssue = (issue: string, suggestion: string, deduction: number) => {
    detectedIssues.push(issue);
    suggestions.push(suggestion);
    deductionTotal += deduction;
  };

  const lines = resumeText.split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLines = lines.slice(0, 6).join(' ');
  const hasEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(firstLines);
  const hasPhone = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/.test(firstLines);
  const foundSections = SECTION_HEADERS.filter((section) =>
    lines.some((line) => line.toLowerCase() === section || line.toLowerCase().startsWith(`${section} `))
  );
  const specialCharCount = (resumeText.match(/[^A-Za-z0-9\s.,;:()/%+&@#\-]/g) || []).length;
  const alphanumericCount = (resumeText.match(/[A-Za-z0-9]/g) || []).length;
  const specialCharRatio = alphanumericCount > 0 ? specialCharCount / alphanumericCount : 0;
  const probableTableLines = lines.filter((line) => line.includes('\t') || /\S\s{5,}\S/.test(line));
  const dateStyleMatches = Array.from(resumeText.matchAll(new RegExp(DATE_TOKEN_SOURCE, 'gi')))
    .map((match) => classifyDateStyle(match[0]))
    .filter((style) => style !== 'present' && style !== 'unknown');
  const dateStyles = dedupeStrings(dateStyleMatches);

  if (!hasEmail || !hasPhone) {
    addIssue(
      'Contact information is not clearly detectable at the top of the resume.',
      'Place your primary email address and phone number in the first lines of the document.',
      16
    );
  }

  if (foundSections.length < 3) {
    addIssue(
      'Standard ATS section headers are limited or missing.',
      'Use clear section headings such as EXPERIENCE, EDUCATION, SKILLS, and PROJECTS.',
      12
    );
  }

  if (specialCharRatio > 0.05) {
    addIssue(
      'The resume contains a high number of special characters that can interfere with parsing.',
      'Prefer simple bullets and standard punctuation instead of decorative symbols or icons.',
      specialCharRatio > 0.08 ? 8 : 5
    );
  }

  if (probableTableLines.length > 2) {
    addIssue(
      'Possible table or multi-column formatting was detected in the extracted text.',
      'Use a single-column layout with left-aligned content so ATS systems read the resume in order.',
      12
    );
  }

  if (lines.length > 110 || resumeText.split(/\s+/).filter(Boolean).length > 950) {
    addIssue(
      'The resume appears long or dense for an entry-level ATS review.',
      'Keep the resume concise and prioritize the most relevant experience and projects.',
      6
    );
  }

  if (dateStyles.length > 1) {
    addIssue(
      'Inconsistent date formats were detected across the resume.',
      'Use one consistent date style throughout the resume, such as MMM YYYY.',
      8
    );
  }

  const chronologyIssues = Array.from(resumeText.matchAll(DATE_RANGE_REGEX)).some((match) => {
    const start = parseDateToken(match[1]);
    const end = parseDateToken(match[2]);
    if (!start || !end) {
      return false;
    }
    const startValue = toComparableDateValue(start);
    const endValue = toComparableDateValue(end);
    if (startValue == null || endValue == null || !Number.isFinite(endValue)) {
      return false;
    }
    return startValue > endValue;
  });

  if (chronologyIssues) {
    addIssue(
      'At least one experience date range appears out of chronological order.',
      'Check start and end dates so every role flows forward correctly on the timeline.',
      10
    );
  }

  const experienceLines = getSectionLines(resumeText, ['experience', 'work experience', 'professional experience']);
  const bulletLikeLines = experienceLines.filter((line) => /^[-*]/.test(line));
  if (experienceLines.length >= 6 && bulletLikeLines.length === 0) {
    addIssue(
      'Experience content is present but bullets are hard to distinguish in the extracted text.',
      'Use short bullet points under each role so achievements are easy for ATS and recruiters to scan.',
      4
    );
  }

  if (dateStyles.length === 0) {
    warnings.push('No clearly parseable resume dates were detected, so timeline scoring may be conservative.');
  }

  return {
    score: clampScore(100 - deductionTotal),
    issues: detectedIssues,
    suggestions,
    warnings,
  };
};

export const buildDeterministicAtsScorecard = (
  resumeText: string,
  jobDescription: string,
  extractionWarnings: string[] = []
): DeterministicAtsScorecard => {
  const skillsAnalysis = evaluateKeywordMatch(resumeText, jobDescription);
  const formattingEvaluation = buildFormattingScore(resumeText);
  const experienceRelevance = evaluateExperienceRelevance(resumeText, skillsAnalysis);

  const overallScore = clampScore(
    (skillsAnalysis.score * 0.45) +
      (experienceRelevance.score * 0.35) +
      (formattingEvaluation.score * 0.2)
  );

  return {
    skillsAnalysis,
    formattingScore: {
      score: formattingEvaluation.score,
      issues: formattingEvaluation.issues,
      suggestions: formattingEvaluation.suggestions,
    },
    experienceRelevance,
    overallScore,
    analysisWarnings: dedupeStrings([...extractionWarnings, ...formattingEvaluation.warnings]),
    scoringBreakdown: {
      skills: skillsAnalysis.score,
      experience: experienceRelevance.score,
      formatting: formattingEvaluation.score,
      weights: {
        skills: 0.45,
        experience: 0.35,
        formatting: 0.2,
      },
      keywordCoverage: Number(skillsAnalysis.coverage.toFixed(3)),
      experienceKeywordCoverage: Number(experienceRelevance.matchedKeywordCoverage.toFixed(3)),
    },
  };
};
