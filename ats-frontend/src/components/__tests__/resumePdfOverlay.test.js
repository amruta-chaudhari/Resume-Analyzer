import { buildOverlaySearchIndex, normalizeOverlaySearchText, resolveOverlayAnchors } from '../resumePdfOverlay';

describe('resumePdfOverlay helpers', () => {
  it('normalizes searchable text for PDF matching', () => {
    expect(normalizeOverlaySearchText('  - Built analytics dashboards!  ')).toBe('built analytics dashboards');
  });

  it('resolves anchored suggestions onto PDF page coordinates', () => {
    const textBoxes = [
      { text: 'Jane Doe', left: 32, top: 24, width: 100, height: 18 },
      { text: 'Experience', left: 32, top: 120, width: 88, height: 18 },
      { text: '- Built analytics dashboards', left: 32, top: 160, width: 200, height: 18 },
      { text: 'React, TypeScript, Figma', left: 32, top: 260, width: 180, height: 18 },
    ];

    const pages = [{
      pageNumber: 1,
      width: 600,
      height: 800,
      textBoxes,
      searchIndex: buildOverlaySearchIndex(textBoxes),
    }];

    const anchors = resolveOverlayAnchors(pages, [
      {
        id: 'overlay-1',
        status: 'anchored',
        anchorSnippet: '- Built analytics dashboards',
        referenceText: '- Built analytics dashboards',
        anchorSection: 'Experience',
      },
      {
        id: 'overlay-2',
        status: 'anchored',
        anchorSnippet: 'React, TypeScript, Figma',
        anchorSection: 'Skills',
      },
    ]);

    expect(anchors).toHaveLength(2);
    expect(anchors[0]).toMatchObject({
      suggestionId: 'overlay-1',
      pageNumber: 1,
      matchedText: '- Built analytics dashboards',
    });
    expect(anchors[0].leftPct).toBeGreaterThan(0);
    expect(anchors[0].topPct).toBeGreaterThan(0);
    expect(anchors[1].matchedText).toBe('React, TypeScript, Figma');
  });
});
