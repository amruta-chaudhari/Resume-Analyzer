import type {
  InlineResumeSuggestionInput,
  ResumeReviewCategory,
  ResumeReviewOverlay,
  ResumeReviewOverlaySuggestion,
  ResumeReviewSeverity,
} from '../types/index';

const MAX_OVERLAY_SUGGESTIONS = 18;
const MIN_REFERENCE_LENGTH = 4;

const CATEGORY_ANCHORS: Record<ResumeReviewCategory, RegExp[]> = {
  skills: [/\bskills\b/i, /\btechnical skills\b/i, /\bcore competencies\b/i],
  experience: [/\bexperience\b/i, /\bwork experience\b/i, /\bprojects\b/i],
  format: [/\bsummary\b/i, /\bexperience\b/i, /\beducation\b/i, /\bskills\b/i],
  content: [/\bsummary\b/i, /\bprofile\b/i, /\bobjective\b/i],
  impact: [/\bachievements\b/i, /\bprojects\b/i, /\bexperience\b/i],
};

const normalizeCategory = (value: string | undefined): ResumeReviewCategory => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'skills' || normalized === 'experience' || normalized === 'format' || normalized === 'content' || normalized === 'impact') {
    return normalized;
  }

  return 'content';
};

const normalizeSeverity = (value: string | undefined): ResumeReviewSeverity => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }

  return 'medium';
};

const extractQuotedReference = (suggestion: string): string | null => {
  const quoted = suggestion.match(/"([^"\n]{4,180})"|'([^'\n]{4,180})'/);
  if (!quoted) {
    return null;
  }

  return (quoted[1] || quoted[2] || '').trim() || null;
};

const buildLineStarts = (text: string): number[] => {
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
};

const lineFromOffset = (lineStarts: number[], offset: number): number => {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      if (mid === lineStarts.length - 1 || lineStarts[mid + 1] > offset) {
        return mid + 1;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return 1;
};

const findSectionAnchor = (
  resumeText: string,
  category: ResumeReviewCategory
): { start: number; end: number } | null => {
  const patterns = CATEGORY_ANCHORS[category] || [];
  for (const pattern of patterns) {
    const match = pattern.exec(resumeText);
    if (match && typeof match.index === 'number') {
      return {
        start: match.index,
        end: match.index + match[0].length,
      };
    }
  }

  return null;
};

const findReferenceRange = (
  resumeTextLower: string,
  referenceText: string,
  usedRanges: Array<{ start: number; end: number }>
): { start: number; end: number } | null => {
  const normalizedReference = referenceText.trim().toLowerCase();
  if (normalizedReference.length < MIN_REFERENCE_LENGTH) {
    return null;
  }

  let cursor = 0;
  while (cursor < resumeTextLower.length) {
    const start = resumeTextLower.indexOf(normalizedReference, cursor);
    if (start < 0) {
      return null;
    }

    const end = start + normalizedReference.length;
    const overlaps = usedRanges.some((range) => start < range.end && end > range.start);
    if (!overlaps) {
      return { start, end };
    }

    cursor = start + 1;
  }

  return null;
};

const buildFallbackInputs = (params: {
  fallbackSuggestions?: string[];
  missingKeywords?: string[];
  formattingIssues?: string[];
  experienceGaps?: string[];
}): InlineResumeSuggestionInput[] => {
  const fallbackSuggestions = (params.fallbackSuggestions || [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((value) => ({
      suggestion: value,
      category: 'content',
      severity: 'medium',
    }));

  const keywordSuggestions = (params.missingKeywords || [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((keyword) => ({
      suggestion: `Include the keyword \"${keyword}\" in a relevant experience bullet to improve ATS matching.`,
      category: 'skills',
      severity: 'high',
    }));

  const formattingSuggestions = (params.formattingIssues || [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((issue) => ({
      suggestion: issue,
      category: 'format',
      severity: 'medium',
    }));

  const experienceSuggestions = (params.experienceGaps || [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((gap) => ({
      suggestion: gap,
      category: 'experience',
      severity: 'medium',
    }));

  return [
    ...fallbackSuggestions,
    ...keywordSuggestions,
    ...formattingSuggestions,
    ...experienceSuggestions,
  ];
};

const buildSuggestionId = (index: number) => `overlay-suggestion-${index + 1}`;

const buildAnchoredSuggestion = (params: {
  suggestionId: string;
  suggestion: string;
  rationale?: string;
  referenceText?: string;
  category: ResumeReviewCategory;
  severity: ResumeReviewSeverity;
  range: { start: number; end: number };
  lineStarts: number[];
}): ResumeReviewOverlaySuggestion => ({
  id: params.suggestionId,
  category: params.category,
  severity: params.severity,
  suggestion: params.suggestion,
  rationale: params.rationale,
  referenceText: params.referenceText,
  status: 'anchored',
  start: params.range.start,
  end: params.range.end,
  lineStart: lineFromOffset(params.lineStarts, params.range.start),
  lineEnd: lineFromOffset(params.lineStarts, Math.max(params.range.start, params.range.end - 1)),
});

const buildUnmappedSuggestion = (params: {
  suggestionId: string;
  suggestion: string;
  rationale?: string;
  referenceText?: string;
  category: ResumeReviewCategory;
  severity: ResumeReviewSeverity;
}): ResumeReviewOverlaySuggestion => ({
  id: params.suggestionId,
  category: params.category,
  severity: params.severity,
  suggestion: params.suggestion,
  rationale: params.rationale,
  referenceText: params.referenceText,
  status: 'unmapped',
  start: null,
  end: null,
  lineStart: null,
  lineEnd: null,
});

export const buildResumeReviewOverlay = (params: {
  resumeText: string;
  inlineSuggestions?: InlineResumeSuggestionInput[];
  fallbackSuggestions?: string[];
  missingKeywords?: string[];
  formattingIssues?: string[];
  experienceGaps?: string[];
}): ResumeReviewOverlay => {
  const normalizedResumeText = (params.resumeText || '').trim();
  if (!normalizedResumeText) {
    return {
      resumeText: '',
      suggestions: [],
      summary: {
        anchored: 0,
        unmapped: 0,
      },
    };
  }

  const lineStarts = buildLineStarts(normalizedResumeText);
  const usedRanges: Array<{ start: number; end: number }> = [];
  const resumeTextLower = normalizedResumeText.toLowerCase();
  const mappedSuggestions: ResumeReviewOverlaySuggestion[] = [];
  const dedupeKeys = new Set<string>();

  const sourceSuggestions = [
    ...(params.inlineSuggestions || []),
    ...buildFallbackInputs(params),
  ];

  for (const source of sourceSuggestions) {
    if (mappedSuggestions.length >= MAX_OVERLAY_SUGGESTIONS) {
      break;
    }

    const suggestion = (source.suggestion || '').trim();
    if (!suggestion) {
      continue;
    }

    const referenceText = (source.referenceText || extractQuotedReference(suggestion) || '').trim();
    const category = normalizeCategory(source.category);
    const severity = normalizeSeverity(source.severity);
    const dedupeKey = `${suggestion.toLowerCase()}::${referenceText.toLowerCase()}`;

    if (dedupeKeys.has(dedupeKey)) {
      continue;
    }
    dedupeKeys.add(dedupeKey);

    const suggestionId = buildSuggestionId(mappedSuggestions.length);

    const directRange = referenceText
      ? findReferenceRange(resumeTextLower, referenceText, usedRanges)
      : null;

    if (directRange) {
      usedRanges.push(directRange);
      mappedSuggestions.push(buildAnchoredSuggestion({
        suggestionId,
        suggestion,
        rationale: source.rationale,
        referenceText,
        category,
        severity,
        range: directRange,
        lineStarts,
      }));
      continue;
    }

    const sectionRange = findSectionAnchor(normalizedResumeText, category);
    if (sectionRange) {
      usedRanges.push(sectionRange);
      mappedSuggestions.push(buildAnchoredSuggestion({
        suggestionId,
        suggestion,
        rationale: source.rationale,
        referenceText: referenceText || undefined,
        category,
        severity,
        range: sectionRange,
        lineStarts,
      }));
      continue;
    }

    mappedSuggestions.push(buildUnmappedSuggestion({
      suggestionId,
      suggestion,
      rationale: source.rationale,
      referenceText: referenceText || undefined,
      category,
      severity,
    }));
  }

  const anchored = mappedSuggestions.filter((item) => item.status === 'anchored').length;

  return {
    resumeText: normalizedResumeText,
    suggestions: mappedSuggestions,
    summary: {
      anchored,
      unmapped: mappedSuggestions.length - anchored,
    },
  };
};
