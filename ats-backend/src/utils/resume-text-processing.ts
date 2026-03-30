const DASH_CHARACTERS_REGEX = /[\u2012\u2013\u2014\u2015\u2212]/g;
const BULLET_CHARACTERS_REGEX = /[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25AA]/g;
const CONTROL_CHARACTERS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const RTF_CONTROL_WORD_REGEX = /\\[a-z]+-?\d* ?/gi;
const RTF_GROUP_REGEX = /[{}]/g;

export interface ResumeExtractionQuality {
  normalizedText: string;
  wordCount: number;
  characterCount: number;
  lineCount: number;
  qualityWarnings: string[];
  likelyScanned: boolean;
}

export const normalizeResumeText = (input: string): string => {
  const normalized = (input || '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARACTERS_REGEX, ' ')
    .replace(DASH_CHARACTERS_REGEX, '-')
    .replace(BULLET_CHARACTERS_REGEX, '- ')
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  return normalized
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
};

export const stripRtfMarkup = (input: string): string =>
  input
    .replace(RTF_CONTROL_WORD_REGEX, ' ')
    .replace(RTF_GROUP_REGEX, ' ')
    .replace(/\\'/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

export const assessResumeExtractionQuality = (
  rawText: string,
  options?: { mimeType?: string; pageCount?: number }
): ResumeExtractionQuality => {
  const normalizedText = normalizeResumeText(rawText);
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const lines = normalizedText.split('\n').map((line) => line.trim()).filter(Boolean);
  const characterCount = normalizedText.length;
  const lineCount = lines.length;
  const wordCount = words.length;

  const qualityWarnings: string[] = [];
  const replacementCharacterCount = (normalizedText.match(/\uFFFD/g) || []).length;
  const printableCount = (normalizedText.match(/[A-Za-z0-9]/g) || []).length;
  const printableRatio = characterCount > 0 ? printableCount / characterCount : 0;
  const averageWordsPerLine = lineCount > 0 ? wordCount / lineCount : 0;

  let likelyScanned = false;

  if (replacementCharacterCount > 0) {
    qualityWarnings.push('Some extracted characters could not be decoded cleanly.');
  }

  if (printableRatio < 0.45 && characterCount > 120) {
    qualityWarnings.push('Extracted text contains a low ratio of readable characters.');
  }

  if (averageWordsPerLine < 2 && lineCount > 25) {
    qualityWarnings.push('Extracted resume text is unusually fragmented line-by-line.');
  }

  if (
    options?.mimeType === 'application/pdf' &&
    (wordCount < 40 || (characterCount < 350 && (options.pageCount || 1) >= 1))
  ) {
    likelyScanned = true;
    qualityWarnings.push('This PDF appears to be image-based or scanned, so text extraction will be unreliable without OCR.');
  }

  return {
    normalizedText,
    wordCount,
    characterCount,
    lineCount,
    qualityWarnings,
    likelyScanned,
  };
};
