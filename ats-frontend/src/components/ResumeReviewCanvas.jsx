import React, { useMemo, useRef, useState } from 'react';
import ResumePdfOverlayPreview from './ResumePdfOverlayPreview';

const severityTone = {
  high: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    mark: 'bg-red-200/80 dark:bg-red-900/70 ring-red-300 dark:ring-red-700',
  },
  medium: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    mark: 'bg-amber-200/80 dark:bg-amber-900/70 ring-amber-300 dark:ring-amber-700',
  },
  low: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    mark: 'bg-blue-100/90 dark:bg-blue-900/60 ring-blue-300 dark:ring-blue-700',
  },
};

const categoryTone = {
  skills: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  experience: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
  format: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
  content: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
  impact: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200',
};

const anchorMethodTone = {
  exact: {
    label: 'Exact phrase anchor',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  section: {
    label: 'Section anchor',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  },
  unmapped: {
    label: 'General guidance',
    className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
  },
};

const blockKindLabel = {
  name: 'Header',
  contact: 'Contact',
  heading: 'Section',
  paragraph: 'Content',
  bullet: 'Bullet',
};

const sectionTitlePattern = /^[A-Z][A-Z\s/&,-]{1,60}$/;
const titleCaseSectionPattern = /^(Summary|Professional Summary|Profile|Objective|Experience|Work Experience|Projects|Education|Skills|Technical Skills|Core Competencies|Certifications|Achievements|Leadership|Awards)$/i;
const bulletPattern = /^[-*•]/;
const contactPattern = /@|\+?\d[\d\s().-]{6,}|linkedin|github|portfolio|website|https?:\/\//i;

const normalizeSuggestions = (overlaySuggestions, fallbackAdvice) => {
  if (Array.isArray(overlaySuggestions) && overlaySuggestions.length > 0) {
    return overlaySuggestions;
  }

  return (fallbackAdvice || []).slice(0, 8).map((suggestion, index) => ({
    id: `fallback-advice-${index + 1}`,
    category: 'content',
    severity: 'medium',
    suggestion,
    status: 'unmapped',
    start: null,
    end: null,
    lineStart: null,
    lineEnd: null,
    anchorMethod: 'unmapped',
    anchorBlockIds: [],
    anchorSection: null,
    anchorSnippet: '',
  }));
};

const parseResumeLines = (resumeText) => {
  const lines = resumeText.split('\n');
  const parsed = [];
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

const isLikelyNameLine = (line) => {
  if (line.lineNumber > 2 || !line.trimmed || line.trimmed.length > 40 || contactPattern.test(line.trimmed)) {
    return false;
  }

  return /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line.trimmed);
};

const isLikelySectionHeading = (line) => {
  if (!line.trimmed || line.trimmed.length > 60 || isLikelyNameLine(line)) {
    return false;
  }

  if (titleCaseSectionPattern.test(line.trimmed)) {
    return true;
  }

  return line.lineNumber > 2 && sectionTitlePattern.test(line.trimmed) && line.trimmed.split(/\s+/).length <= 5;
};

const normalizeSectionId = (value) => {
  const normalized = (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'section';
};

const buildFallbackDocument = (resumeText) => {
  if (!resumeText) {
    return { blocks: [], sections: [] };
  }

  const lines = parseResumeLines(resumeText);
  const blocks = [];
  const sections = [];
  let blockCounter = 0;
  let sectionCounter = 0;
  let currentSection = null;
  let paragraphLines = [];

  const commitBlock = ({ kind, text, start, end, lineStart, lineEnd }) => {
    if (!text.trim()) {
      return;
    }

    const block = {
      id: `resume-block-${++blockCounter}`,
      kind,
      text,
      start,
      end,
      lineStart,
      lineEnd,
      sectionTitle: currentSection?.title || null,
    };

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
    commitBlock({
      kind: 'paragraph',
      text: paragraphLines.map((line) => line.raw).join('\n'),
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

    if (contactPattern.test(line.trimmed)) {
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

    if (bulletPattern.test(line.trimmed)) {
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
  return { blocks, sections };
};

const findBlockIdsForRange = (blocks, start, end) => blocks
  .filter((block) => start < block.end && end > block.start)
  .map((block) => block.id);

const findSectionTitleForBlocks = (blocks, blockIds) => {
  for (const blockId of blockIds) {
    const block = blocks.find((item) => item.id === blockId);
    if (block?.sectionTitle) {
      return block.sectionTitle;
    }
  }

  return null;
};

const enrichSuggestions = (suggestions, blocks, resumeText) => suggestions.map((item, index) => {
  const hasRange = Number.isInteger(item.start) && Number.isInteger(item.end) && item.end > item.start;
  const anchorBlockIds = Array.isArray(item.anchorBlockIds) && item.anchorBlockIds.length > 0
    ? item.anchorBlockIds
    : (hasRange ? findBlockIdsForRange(blocks, item.start, item.end) : []);
  const anchorSection = item.anchorSection ?? findSectionTitleForBlocks(blocks, anchorBlockIds);
  const anchorMethod = item.anchorMethod || (item.status === 'anchored'
    ? (item.referenceText ? 'exact' : 'section')
    : 'unmapped');
  const anchorSnippet = item.anchorSnippet || (hasRange
    ? resumeText.slice(item.start, item.end)
    : (item.referenceText || ''));

  return {
    ...item,
    anchorBlockIds,
    anchorMethod,
    anchorSection,
    anchorSnippet,
    ordinal: index + 1,
  };
});

const buildBlockSegments = (block, suggestions) => {
  if (!block?.text) {
    return [{ type: 'text', text: '' }];
  }

  const anchoredSuggestions = suggestions
    .filter((item) => item.status === 'anchored' && Number.isInteger(item.start) && Number.isInteger(item.end) && item.end > item.start)
    .sort((a, b) => a.start - b.start);

  if (anchoredSuggestions.length === 0) {
    return [{ type: 'text', text: block.text }];
  }

  const segments = [];
  let cursor = 0;

  anchoredSuggestions.forEach((item) => {
    const relativeStart = Math.max(item.start, block.start) - block.start;
    const relativeEnd = Math.min(item.end, block.end) - block.start;

    if (relativeEnd <= relativeStart || relativeStart < cursor || relativeStart >= block.text.length) {
      return;
    }

    if (cursor < relativeStart) {
      segments.push({
        type: 'text',
        text: block.text.slice(cursor, relativeStart),
      });
    }

    segments.push({
      type: 'mark',
      text: block.text.slice(relativeStart, Math.min(relativeEnd, block.text.length)),
      suggestionId: item.id,
      severity: item.severity,
    });

    cursor = Math.min(relativeEnd, block.text.length);
  });

  if (cursor < block.text.length) {
    segments.push({
      type: 'text',
      text: block.text.slice(cursor),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text: block.text }];
};

const blockTextClassName = (kind) => {
  if (kind === 'name') {
    return 'text-2xl font-semibold text-slate-900 dark:text-white';
  }

  if (kind === 'heading') {
    return 'text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300';
  }

  if (kind === 'contact') {
    return 'text-sm text-slate-500 dark:text-slate-300';
  }

  if (kind === 'bullet') {
    return 'text-sm leading-7 text-slate-700 dark:text-slate-100 pl-4 border-l-2 border-slate-200 dark:border-slate-700';
  }

  return 'text-sm leading-7 text-slate-700 dark:text-slate-100';
};

const ResumeReviewCanvas = ({ results }) => {
  const [activeSuggestionId, setActiveSuggestionId] = useState(null);
  const blockRefs = useRef({});

  const overlay = results?.resumeReviewOverlay || null;
  const resumeText = (overlay?.resumeText || results?.resume?.extractedText || results?.resume?.content || '').trim();

  const rawSuggestions = useMemo(
    () => normalizeSuggestions(overlay?.suggestions, results?.actionableAdvice),
    [overlay?.suggestions, results?.actionableAdvice]
  );

  const documentMap = useMemo(() => {
    if (overlay?.document?.blocks?.length) {
      return overlay.document;
    }

    return buildFallbackDocument(resumeText);
  }, [overlay?.document, resumeText]);

  const suggestions = useMemo(
    () => enrichSuggestions(rawSuggestions, documentMap.blocks || [], resumeText),
    [documentMap.blocks, rawSuggestions, resumeText]
  );

  const suggestionsByBlock = useMemo(() => {
    const map = {};

    suggestions.forEach((suggestion) => {
      (suggestion.anchorBlockIds || []).forEach((blockId) => {
        if (!map[blockId]) {
          map[blockId] = [];
        }
        map[blockId].push(suggestion);
      });
    });

    return map;
  }, [suggestions]);

  const activeSuggestion = suggestions.find((item) => item.id === activeSuggestionId) || null;
  const anchoredCount = suggestions.filter((item) => item.status === 'anchored').length;

  const focusSuggestion = (suggestionId) => {
    setActiveSuggestionId(suggestionId);
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    const targetBlockId = suggestion?.anchorBlockIds?.[0];
    const blockNode = targetBlockId ? blockRefs.current[targetBlockId] : null;

    if (blockNode && typeof blockNode.scrollIntoView === 'function') {
      blockNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  };

  const textFallbackPreview = (
    <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/70 shadow-inner dark:bg-slate-950/40">
      <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Resume Snapshot</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Stable block anchors derived from the exact text analyzed by ATS scoring.</p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Hover a numbered pin or highlighted phrase to inspect linked guidance.</p>
        </div>
      </div>

      {resumeText ? (
        <div className="max-h-[44rem] overflow-auto bg-gradient-to-b from-slate-50 to-white p-5 dark:from-slate-950 dark:to-slate-950/80 sm:p-7">
          <div className="mx-auto max-w-3xl space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
            {documentMap.blocks.map((block) => {
              const blockSuggestions = suggestionsByBlock[block.id] || [];
              const blockSegments = buildBlockSegments(block, blockSuggestions);
              const isActive = blockSuggestions.some((item) => item.id === activeSuggestionId);
              const textClassName = blockTextClassName(block.kind);

              return (
                <article
                  key={block.id}
                  ref={(node) => {
                    if (node) {
                      blockRefs.current[block.id] = node;
                    }
                  }}
                  className={`relative rounded-2xl border px-4 py-4 transition ${
                    isActive
                      ? 'border-cyan-300 bg-cyan-50/70 shadow-sm dark:border-cyan-700 dark:bg-cyan-900/20'
                      : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50/80 dark:hover:border-slate-800 dark:hover:bg-slate-900/40'
                  }`}
                  tabIndex={blockSuggestions.length > 0 ? 0 : -1}
                  onMouseEnter={() => {
                    if (blockSuggestions[0]) {
                      setActiveSuggestionId(blockSuggestions[0].id);
                    }
                  }}
                  onFocus={() => {
                    if (blockSuggestions[0]) {
                      setActiveSuggestionId(blockSuggestions[0].id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (blockSuggestions.some((item) => item.id === activeSuggestionId)) {
                      setActiveSuggestionId(null);
                    }
                  }}
                  onBlur={() => {
                    if (blockSuggestions.some((item) => item.id === activeSuggestionId)) {
                      setActiveSuggestionId(null);
                    }
                  }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2 pr-20 text-[11px] font-semibold uppercase tracking-[0.08em]">
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {blockKindLabel[block.kind] || 'Block'}
                    </span>
                    {block.sectionTitle && block.kind !== 'heading' && (
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                        {block.sectionTitle}
                      </span>
                    )}
                    <span className="rounded-full bg-white px-2 py-1 text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                      Lines {block.lineStart}{block.lineEnd !== block.lineStart ? `-${block.lineEnd}` : ''}
                    </span>
                  </div>

                  {blockSuggestions.length > 0 && (
                    <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">
                      {blockSuggestions.slice(0, 3).map((suggestion) => {
                        const isPinnedActive = activeSuggestionId === suggestion.id;

                        return (
                          <button
                            key={suggestion.id}
                            type="button"
                            className={`h-8 min-w-8 rounded-full px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                              isPinnedActive
                                ? 'bg-cyan-500 text-white shadow-sm'
                                : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            }`}
                            aria-label={`Focus improvement ${suggestion.ordinal} for ${block.sectionTitle || 'this block'}`}
                            onClick={() => focusSuggestion(suggestion.id)}
                          >
                            {suggestion.ordinal}
                          </button>
                        );
                      })}
                      {blockSuggestions.length > 3 && (
                        <span className="inline-flex h-8 items-center rounded-full bg-slate-200 px-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          +{blockSuggestions.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={textClassName}>
                    {blockSegments.map((segment, index) => {
                      if (segment.type === 'text') {
                        return <span key={`${block.id}-text-${index}`}>{segment.text}</span>;
                      }

                      const suggestion = suggestions.find((item) => item.id === segment.suggestionId);
                      const tone = severityTone[suggestion?.severity] || severityTone.medium;
                      const isMarkActive = activeSuggestionId === segment.suggestionId;

                      return (
                        <mark
                          key={`${block.id}-mark-${segment.suggestionId}-${index}`}
                          className={`rounded px-1.5 py-0.5 ring-1 ring-offset-1 ring-offset-transparent transition ${tone.mark} ${isMarkActive ? 'ring-2 shadow-sm' : ''}`}
                          tabIndex={0}
                          aria-label={`Resume highlight for ${suggestion?.category || 'content'} improvement`}
                          onMouseEnter={() => setActiveSuggestionId(segment.suggestionId)}
                          onFocus={() => setActiveSuggestionId(segment.suggestionId)}
                          onMouseLeave={() => {
                            if (activeSuggestionId === segment.suggestionId) {
                              setActiveSuggestionId(null);
                            }
                          }}
                          onBlur={() => {
                            if (activeSuggestionId === segment.suggestionId) {
                              setActiveSuggestionId(null);
                            }
                          }}
                        >
                          {segment.text}
                        </mark>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-5 text-sm text-slate-600 dark:text-slate-300">
          Resume text is unavailable for this analysis. Uploading a file with extractable text enables the review canvas.
        </div>
      )}
    </div>
  );

  return (
    <section className="glass-strong rounded-3xl p-6 sm:p-8" aria-labelledby="resume-review-canvas-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="resume-review-canvas-title" className="text-2xl font-bold text-gray-900 dark:text-white">
            Resume Review Canvas
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Inspect the analyzed resume as a document surface and hover through the exact blocks that need improvement.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            Anchored {anchoredCount}
          </span>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            Sections {documentMap.sections?.length || 0}
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
            Blocks {documentMap.blocks?.length || 0}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ResumePdfOverlayPreview
            resumeId={results?.resume?.id}
            suggestions={suggestions}
            activeSuggestionId={activeSuggestionId}
            onFocusSuggestion={focusSuggestion}
            onHoverSuggestion={setActiveSuggestionId}
            onClearHover={() => undefined}
            fallback={textFallbackPreview}
          />
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/20 bg-white/70 p-4 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Focused Improvement</p>
            {activeSuggestion ? (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                  <span className={`rounded-full px-2 py-1 ${categoryTone[activeSuggestion.category] || categoryTone.content}`}>
                    {activeSuggestion.category}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${severityTone[activeSuggestion.severity]?.badge || severityTone.medium.badge}`}>
                    {activeSuggestion.severity}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${anchorMethodTone[activeSuggestion.anchorMethod]?.className || anchorMethodTone.unmapped.className}`}>
                    {anchorMethodTone[activeSuggestion.anchorMethod]?.label || anchorMethodTone.unmapped.label}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-white">{activeSuggestion.suggestion}</p>

                {activeSuggestion.anchorSection && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Focus area: <span className="font-semibold text-slate-700 dark:text-slate-200">{activeSuggestion.anchorSection}</span>
                  </p>
                )}

                {activeSuggestion.anchorSnippet && (
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    "{activeSuggestion.anchorSnippet}"
                  </div>
                )}

                {activeSuggestion.rationale && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{activeSuggestion.rationale}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Hover a resume block, highlight, or suggestion card to inspect the exact improvement in context.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/70 p-4 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                Overlay Suggestions
              </h4>
              <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {suggestions.length}
              </span>
            </div>

            <ul className="mt-3 max-h-[40rem] space-y-3 overflow-auto pr-1" aria-live="polite">
              {suggestions.length === 0 && (
                <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  No suggestions are available for this analysis yet.
                </li>
              )}

              {suggestions.map((item) => {
                const isActive = activeSuggestionId === item.id;
                const severity = severityTone[item.severity] || severityTone.medium;
                const category = categoryTone[item.category] || categoryTone.content;
                const anchorTone = anchorMethodTone[item.anchorMethod] || anchorMethodTone.unmapped;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-50/80 dark:border-cyan-600 dark:bg-cyan-900/30'
                          : 'border-white/30 bg-white/50 hover:bg-white/80 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:bg-slate-900/60'
                      }`}
                      onClick={() => focusSuggestion(item.id)}
                      onMouseEnter={() => setActiveSuggestionId(item.id)}
                      onFocus={() => setActiveSuggestionId(item.id)}
                      onMouseLeave={() => {
                        if (activeSuggestionId === item.id) {
                          setActiveSuggestionId(null);
                        }
                      }}
                      onBlur={() => {
                        if (activeSuggestionId === item.id) {
                          setActiveSuggestionId(null);
                        }
                      }}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                        <span className={`rounded-full px-2 py-1 ${category}`}>{item.category}</span>
                        <span className={`rounded-full px-2 py-1 ${severity.badge}`}>{item.severity}</span>
                        <span className={`rounded-full px-2 py-1 ${anchorTone.className}`}>{anchorTone.label}</span>
                        {item.anchorSection && (
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                            {item.anchorSection}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-slate-900 dark:text-white">{item.suggestion}</p>

                      {item.anchorSnippet && (
                        <p className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          "{item.anchorSnippet}"
                        </p>
                      )}

                      {item.status !== 'anchored' && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          This recommendation was not mapped to a precise snippet, but it still applies to this resume version.
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResumeReviewCanvas;
