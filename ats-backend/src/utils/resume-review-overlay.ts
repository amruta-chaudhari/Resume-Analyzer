import type {
  InlineResumeSuggestionInput,
  ResumeReviewAnchorMethod,
  ResumeReviewCategory,
  ResumeReviewDocument,
  ResumeReviewDocumentBlock,
  ResumeReviewDocumentBlockKind,
  ResumeReviewOverlay,
  ResumeReviewOverlaySuggestion,
  ResumeReviewSeverity,
} from '../types/index';

const MAX_OVERLAY_SUGGESTIONS = 18;
const MIN_REFERENCE_LENGTH = 4;
const SECTION_TITLE_PATTERN = /^[A-Z][A-Z\s/&,-]{1,60}$/;
const TITLE_CASE_SECTION_PATTERN = /^(Summary|Professional Summary|Profile|Objective|Experience|Work Experience|Projects|Education|Skills|Technical Skills|Core Competencies|Certifications|Achievements|Leadership|Awards)$/i;
const BULLET_PATTERN = /^[-*•]/;
const CONTACT_PATTERN = /@|\+?\d[\d\s().-]{6,}|linkedin|github|portfolio|website|https?:\/\//i;

const CATEGORY_ANCHORS: Record<ResumeReviewCategory, RegExp[]> = {
  skills: [/\bskills\b/i, /\btechnical skills\b/i, /\bcore competencies\b/i, /\btooling\b/i],
  experience: [/\bexperience\b/i, /\bwork experience\b/i, /\bprojects\b/i, /\bemployment\b/i],
  format: [/\bsummary\b/i, /\bexperience\b/i, /\beducation\b/i, /\bskills\b/i, /\bprojects\b/i],
  content: [/\bsummary\b/i, /\bprofile\b/i, /\bobjective\b/i, /\babout\b/i],
  impact: [/\bachievements\b/i, /\bprojects\b/i, /\bexperience\b/i, /\baccomplishments\b/i],
};

type ResumeLine = {
  raw: string;
  trimmed: string;
  start: number;
  end: number;
  lineNumber: number;
};

const normalizeSectionId = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'section';
};

const parseResumeLines = (resumeText: string): ResumeLine[] => {
  const lines = resumeText.split('\n');
  const parsed: ResumeLine[] = [];
  let cursor = 0;

  lines.forEach((raw, index) => {
    parsed.push({
      raw,
      trimmed: raw.trim(),
      start: cursor,
      end: cursor + raw.length,
      lineNumber: index + 1,
    });
    cursor += raw.length + 1;
  });

  return parsed;
};

const isLikelyNameLine = (line: ResumeLine) => {
  if (line.lineNumber > 2 || !line.trimmed || line.trimmed.length > 40 || CONTACT_PATTERN.test(line.trimmed)) {
    return false;
  }

  return /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line.trimmed);
};

const isLikelySectionHeading = (line: ResumeLine) => {
  if (!line.trimmed || line.trimmed.length > 60 || isLikelyNameLine(line)) {
    return false;
  }

  if (TITLE_CASE_SECTION_PATTERN.test(line.trimmed)) {
    return true;
  }

  return line.lineNumber > 2 && SECTION_TITLE_PATTERN.test(line.trimmed) && line.trimmed.split(/\s+/).length <= 5;
};

const createBlock = (params: {
  id: string;
  kind: ResumeReviewDocumentBlockKind;
  text: string;
  start: number;
  end: number;
  lineStart: number;
  lineEnd: number;
  sectionTitle: string | null;
}): ResumeReviewDocumentBlock => ({
  id: params.id,
  kind: params.kind,
  text: params.text,
  start: params.start,
  end: params.end,
  lineStart: params.lineStart,
  lineEnd: params.lineEnd,
  sectionTitle: params.sectionTitle,
});

const buildResumeReviewDocument = (resumeText: string): ResumeReviewDocument => {
  const lines = parseResumeLines(resumeText);
  const blocks: ResumeReviewDocumentBlock[] = [];
  const sections: ResumeReviewDocument['sections'] = [];
  let blockCounter = 0;
  let sectionCounter = 0;
  let currentSection: ResumeReviewDocument['sections'][number] | null = null;
  let paragraphLines: ResumeLine[] = [];

  const commitBlock = (params: {
    kind: ResumeReviewDocumentBlockKind;
    text: string;
    start: number;
    end: number;
    lineStart: number;
    lineEnd: number;
  }) => {
    if (!params.text.trim()) {
      return;
    }

    const block = createBlock({
      id: `resume-block-${++blockCounter}`,
      kind: params.kind,
      text: params.text,
      start: params.start,
      end: params.end,
      lineStart: params.lineStart,
      lineEnd: params.lineEnd,
      sectionTitle: currentSection?.title || null,
    });

    blocks.push(block);

    if (currentSection) {
      currentSection.blockIds.push(block.id);
      currentSection.end = block.end;
      currentSection.lineEnd = block.lineEnd;
    }
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    const firstLine = paragraphLines[0];
    const lastLine = paragraphLines[paragraphLines.length - 1];
    const text = paragraphLines.map((line) => line.raw).join('\n');
    commitBlock({
      kind: 'paragraph',
      text,
      start: firstLine.start,
      end: lastLine.end,
      lineStart: firstLine.lineNumber,
      lineEnd: lastLine.lineNumber,
    });
    paragraphLines = [];
  };

  lines.forEach((line) => {
    if (!line.trimmed) {
      flushParagraph();
      return;
    }

    if (isLikelySectionHeading(line)) {
      flushParagraph();
      currentSection = {
        id: `resume-section-${normalizeSectionId(line.trimmed)}-${++sectionCounter}`,
        title: line.trimmed,
        start: line.start,
        end: line.end,
        lineStart: line.lineNumber,
        lineEnd: line.lineNumber,
        blockIds: [],
      };
      sections.push(currentSection);
      commitBlock({
        kind: 'heading',
        text: line.raw,
        start: line.start,
        end: line.end,
        lineStart: line.lineNumber,
        lineEnd: line.lineNumber,
      });
      return;
    }

    if (isLikelyNameLine(line)) {
      flushParagraph();
      commitBlock({
        kind: 'name',
        text: line.raw,
        start: line.start,
        end: line.end,
        lineStart: line.lineNumber,
        lineEnd: line.lineNumber,
      });
      return;
    }

    if (CONTACT_PATTERN.test(line.trimmed)) {
      flushParagraph();
      commitBlock({
        kind: 'contact',
        text: line.raw,
        start: line.start,
        end: line.end,
        lineStart: line.lineNumber,
        lineEnd: line.lineNumber,
      });
      return;
    }

    if (BULLET_PATTERN.test(line.trimmed)) {
      flushParagraph();
      commitBlock({
        kind: 'bullet',
        text: line.raw,
        start: line.start,
        end: line.end,
        lineStart: line.lineNumber,
        lineEnd: line.lineNumber,
      });
      return;
    }

    paragraphLines.push(line);
  });

  flushParagraph();

  return {
    blocks,
    sections,
  };
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
  document: ResumeReviewDocument,
  category: ResumeReviewCategory
): { start: number; end: number; sectionTitle: string | null; blockIds: string[] } | null => {
  const patterns = CATEGORY_ANCHORS[category] || [];
  for (const section of document.sections) {
    const matches = patterns.some((pattern) => pattern.test(section.title));
    if (!matches) {
      continue;
    }

    const contentBlock = document.blocks.find((block) => section.blockIds.includes(block.id) && block.kind !== 'heading');
    const anchorBlock = contentBlock || document.blocks.find((block) => section.blockIds.includes(block.id));

    if (anchorBlock) {
      return {
        start: anchorBlock.start,
        end: anchorBlock.end,
        sectionTitle: section.title,
        blockIds: [anchorBlock.id],
      };
    }

    return {
      start: section.start,
      end: section.end,
      sectionTitle: section.title,
      blockIds: [],
    };
  }

  return null;
};

const findBlockIdsForRange = (
  blocks: ResumeReviewDocumentBlock[],
  range: { start: number; end: number }
) => blocks
  .filter((block) => range.start < block.end && range.end > block.start)
  .map((block) => block.id);

const findSectionTitleForBlocks = (
  blocks: ResumeReviewDocumentBlock[],
  blockIds: string[]
) => {
  for (const blockId of blockIds) {
    const block = blocks.find((item) => item.id === blockId);
    if (block?.sectionTitle) {
      return block.sectionTitle;
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
  anchorMethod: ResumeReviewAnchorMethod;
  anchorSection: string | null;
  anchorBlockIds: string[];
  anchorSnippet: string;
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
  anchorMethod: params.anchorMethod,
  anchorSection: params.anchorSection,
  anchorBlockIds: params.anchorBlockIds,
  anchorSnippet: params.anchorSnippet,
});

const buildUnmappedSuggestion = (params: {
  suggestionId: string;
  suggestion: string;
  rationale?: string;
  referenceText?: string;
  category: ResumeReviewCategory;
  severity: ResumeReviewSeverity;
  anchorSection?: string | null;
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
  anchorMethod: 'unmapped',
  anchorSection: params.anchorSection ?? null,
  anchorBlockIds: [],
  anchorSnippet: params.referenceText,
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
      document: {
        blocks: [],
        sections: [],
      },
      suggestions: [],
      summary: {
        anchored: 0,
        unmapped: 0,
      },
    };
  }

  const lineStarts = buildLineStarts(normalizedResumeText);
  const document = buildResumeReviewDocument(normalizedResumeText);
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
      const anchorBlockIds = findBlockIdsForRange(document.blocks, directRange);
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
        anchorMethod: 'exact',
        anchorSection: findSectionTitleForBlocks(document.blocks, anchorBlockIds),
        anchorBlockIds,
        anchorSnippet: normalizedResumeText.slice(directRange.start, directRange.end),
      }));
      continue;
    }

    const sectionRange = findSectionAnchor(document, category);
    if (sectionRange) {
      const anchoredRange = { start: sectionRange.start, end: sectionRange.end };
      usedRanges.push(anchoredRange);
      mappedSuggestions.push(buildAnchoredSuggestion({
        suggestionId,
        suggestion,
        rationale: source.rationale,
        referenceText: referenceText || undefined,
        category,
        severity,
        range: anchoredRange,
        lineStarts,
        anchorMethod: 'section',
        anchorSection: sectionRange.sectionTitle,
        anchorBlockIds: sectionRange.blockIds,
        anchorSnippet: normalizedResumeText.slice(sectionRange.start, sectionRange.end),
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
      anchorSection: null,
    }));
  }

  const anchored = mappedSuggestions.filter((item) => item.status === 'anchored').length;

  return {
    resumeText: normalizedResumeText,
    document,
    suggestions: mappedSuggestions,
    summary: {
      anchored,
      unmapped: mappedSuggestions.length - anchored,
    },
  };
};
