import { buildResumeReviewOverlay } from '../resume-review-overlay';

describe('buildResumeReviewOverlay', () => {
  it('anchors inline suggestions to matched resume snippets', () => {
    const resumeText = [
      'Jane Doe',
      'Skills',
      'React, TypeScript, Node.js',
      'Experience',
      'Built a resume analyzer dashboard used by 500 students.',
    ].join('\n');

    const overlay = buildResumeReviewOverlay({
      resumeText,
      inlineSuggestions: [
        {
          referenceText: 'React, TypeScript, Node.js',
          suggestion: 'Add GraphQL to showcase API integration breadth.',
          category: 'skills',
          severity: 'high',
        },
      ],
    });

    expect(overlay.resumeText).toBe(resumeText);
    expect(overlay.summary.anchored).toBe(1);
    expect(overlay.summary.unmapped).toBe(0);
    expect(overlay.suggestions).toHaveLength(1);

    const [firstSuggestion] = overlay.suggestions;
    expect(firstSuggestion.status).toBe('anchored');
    expect(firstSuggestion.anchorMethod).toBe('exact');
    expect(firstSuggestion.anchorSection).toBe('Skills');
    expect(firstSuggestion.anchorBlockIds).toHaveLength(1);
    expect(firstSuggestion.anchorSnippet).toBe('React, TypeScript, Node.js');
    expect(firstSuggestion.lineStart).toBe(3);
    expect(firstSuggestion.lineEnd).toBe(3);
    expect(firstSuggestion.start).not.toBeNull();
    expect(firstSuggestion.end).not.toBeNull();
    expect(overlay.document?.sections[0]?.title).toBe('Skills');
    expect(overlay.document?.blocks.some((block) => block.kind === 'paragraph')).toBe(true);
  });

  it('uses section anchors for fallback keyword suggestions', () => {
    const resumeText = [
      'Jane Doe',
      'Skills',
      'React, TypeScript',
      'Experience',
      'Built internal tools for faculty workflows.',
    ].join('\n');

    const overlay = buildResumeReviewOverlay({
      resumeText,
      missingKeywords: ['GraphQL'],
      fallbackSuggestions: ['Quantify impact where possible.'],
    });

    const keywordSuggestion = overlay.suggestions.find((item) => item.suggestion.includes('GraphQL'));

    expect(keywordSuggestion).toBeDefined();
    expect(keywordSuggestion?.status).toBe('anchored');
    expect(keywordSuggestion?.anchorMethod).toBe('section');
    expect(keywordSuggestion?.anchorSection).toBe('Skills');
    expect(keywordSuggestion?.anchorBlockIds?.length).toBeGreaterThan(0);
    expect(keywordSuggestion?.lineStart).toBe(3);
    expect(overlay.summary.anchored).toBeGreaterThan(0);
  });

  it('returns empty overlay when resume text is missing', () => {
    const overlay = buildResumeReviewOverlay({
      resumeText: '   ',
      inlineSuggestions: [
        {
          referenceText: 'Skills',
          suggestion: 'This should not be included when text is empty.',
        },
      ],
    });

    expect(overlay.resumeText).toBe('');
    expect(overlay.document).toEqual({ blocks: [], sections: [] });
    expect(overlay.suggestions).toEqual([]);
    expect(overlay.summary).toEqual({ anchored: 0, unmapped: 0 });
  });
});
