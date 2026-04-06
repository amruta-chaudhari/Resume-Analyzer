const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const normalizeOverlaySearchText = (value = '') => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const buildOverlaySearchIndex = (textBoxes = []) => {
  let text = '';
  const ranges = [];

  textBoxes.forEach((box, index) => {
    const normalized = normalizeOverlaySearchText(box.text || '');
    if (!normalized) {
      return;
    }

    const start = text.length > 0 ? text.length + 1 : 0;
    text = text.length > 0 ? `${text} ${normalized}` : normalized;
    const end = start + normalized.length;

    ranges.push({
      index,
      start,
      end,
      box,
    });
  });

  return { text, ranges };
};

const mergeBoxes = (boxes = []) => {
  if (boxes.length === 0) {
    return null;
  }

  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.left + box.width));
  const bottom = Math.max(...boxes.map((box) => box.top + box.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
};

const findCandidateBox = (page, candidate) => {
  const normalizedCandidate = normalizeOverlaySearchText(candidate);
  if (!normalizedCandidate) {
    return null;
  }

  const searchIndex = page.searchIndex || buildOverlaySearchIndex(page.textBoxes || []);
  let cursor = 0;

  while (cursor < searchIndex.text.length) {
    const start = searchIndex.text.indexOf(normalizedCandidate, cursor);
    if (start < 0) {
      return null;
    }

    const end = start + normalizedCandidate.length;
    const matchedRanges = searchIndex.ranges.filter((range) => start < range.end && end > range.start);
    const matchedBox = mergeBoxes(matchedRanges.map((range) => range.box));

    if (matchedBox) {
      return {
        matchedText: candidate,
        box: matchedBox,
      };
    }

    cursor = start + 1;
  }

  return null;
};

export const resolveOverlayAnchors = (pages = [], suggestions = []) => {
  const anchors = [];
  const locationCounts = {};

  suggestions
    .filter((suggestion) => suggestion?.status === 'anchored')
    .forEach((suggestion) => {
      const candidates = Array.from(new Set([
        suggestion.anchorSnippet,
        suggestion.referenceText,
        suggestion.anchorSection,
      ].filter(Boolean)));

      let match = null;

      for (const candidate of candidates) {
        for (const page of pages) {
          const pageMatch = findCandidateBox(page, candidate);
          if (pageMatch) {
            match = { page, ...pageMatch };
            break;
          }
        }

        if (match) {
          break;
        }
      }

      if (!match) {
        return;
      }

      const leftPct = clamp((match.box.left / match.page.width) * 100, 0, 100);
      const topPct = clamp((match.box.top / match.page.height) * 100, 0, 100);
      const widthPct = clamp((match.box.width / match.page.width) * 100, 2, 100);
      const heightPct = clamp((match.box.height / match.page.height) * 100, 2, 100);
      const locationKey = `${match.page.pageNumber}:${Math.round(leftPct)}:${Math.round(topPct)}`;
      const stackIndex = locationCounts[locationKey] || 0;

      locationCounts[locationKey] = stackIndex + 1;

      anchors.push({
        suggestionId: suggestion.id,
        pageNumber: match.page.pageNumber,
        leftPct,
        topPct,
        widthPct,
        heightPct,
        iconLeftPct: clamp(leftPct + widthPct - 1 + (stackIndex * 2), 4, 96),
        iconTopPct: clamp(topPct + 2 + (stackIndex * 2), 4, 94),
        matchedText: match.matchedText,
        stackIndex,
      });
    });

  return anchors;
};
