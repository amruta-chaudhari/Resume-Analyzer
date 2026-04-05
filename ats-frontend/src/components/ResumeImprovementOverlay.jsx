import React, { useMemo, useRef, useState } from 'react';

const severityTone = {
  high: {
    tag: 'text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/40',
    mark: 'bg-red-200/80 dark:bg-red-900/70 ring-red-300 dark:ring-red-700',
  },
  medium: {
    tag: 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/40',
    mark: 'bg-amber-200/80 dark:bg-amber-900/70 ring-amber-300 dark:ring-amber-700',
  },
  low: {
    tag: 'text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/40',
    mark: 'bg-blue-200/80 dark:bg-blue-900/70 ring-blue-300 dark:ring-blue-700',
  },
};

const categoryTone = {
  skills: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  experience: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
  format: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
  content: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
  impact: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200',
};

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
  }));
};

const buildSegments = (resumeText, suggestions) => {
  if (!resumeText) {
    return [{ type: 'text', text: '' }];
  }

  const anchored = suggestions
    .filter((item) => item.status === 'anchored' && Number.isInteger(item.start) && Number.isInteger(item.end) && item.end > item.start)
    .sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;

  anchored.forEach((item) => {
    if (item.start < cursor || item.start >= resumeText.length) {
      return;
    }

    if (cursor < item.start) {
      segments.push({
        type: 'text',
        text: resumeText.slice(cursor, item.start),
      });
    }

    segments.push({
      type: 'mark',
      text: resumeText.slice(item.start, Math.min(item.end, resumeText.length)),
      suggestionId: item.id,
      severity: item.severity,
    });

    cursor = Math.min(item.end, resumeText.length);
  });

  if (cursor < resumeText.length) {
    segments.push({
      type: 'text',
      text: resumeText.slice(cursor),
    });
  }

  if (segments.length === 0) {
    return [{ type: 'text', text: resumeText }];
  }

  return segments;
};

const ResumeImprovementOverlay = ({ results }) => {
  const [activeSuggestionId, setActiveSuggestionId] = useState(null);
  const markRefs = useRef({});

  const overlay = results?.resumeReviewOverlay || null;
  const resumeText = (overlay?.resumeText || results?.resume?.extractedText || results?.resume?.content || '').trim();

  const suggestions = useMemo(
    () => normalizeSuggestions(overlay?.suggestions, results?.actionableAdvice),
    [overlay?.suggestions, results?.actionableAdvice]
  );

  const segments = useMemo(() => buildSegments(resumeText, suggestions), [resumeText, suggestions]);

  const anchoredCount = suggestions.filter((item) => item.status === 'anchored').length;

  const focusSuggestion = (suggestionId) => {
    setActiveSuggestionId(suggestionId);
    const markedNode = markRefs.current[suggestionId];
    if (markedNode && typeof markedNode.scrollIntoView === 'function') {
      markedNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  };

  return (
    <section className="glass-strong rounded-3xl p-6 sm:p-8" aria-labelledby="resume-overlay-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="resume-overlay-title" className="text-2xl font-bold text-gray-900 dark:text-white">
            Inline Resume Improvement Map
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Review suggestions in context and inspect exactly where each improvement applies.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            Anchored {anchoredCount}
          </span>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            Total {suggestions.length}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <div className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-inner dark:bg-slate-900/40">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Resume Text</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Hover or focus a highlight for linked advice</p>
            </div>

            {resumeText ? (
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/70 p-4 text-sm leading-6 text-gray-800 dark:bg-slate-950/40 dark:text-gray-100">
                {segments.map((segment, index) => {
                  if (segment.type === 'text') {
                    return <span key={`txt-${index}`}>{segment.text}</span>;
                  }

                  const suggestion = suggestions.find((item) => item.id === segment.suggestionId);
                  const tone = severityTone[suggestion?.severity] || severityTone.medium;
                  const isActive = activeSuggestionId === segment.suggestionId;

                  return (
                    <mark
                      key={`mark-${segment.suggestionId}-${index}`}
                      ref={(node) => {
                        if (node && segment.suggestionId) {
                          markRefs.current[segment.suggestionId] = node;
                        }
                      }}
                      className={`rounded px-1.5 py-0.5 ring-1 ring-offset-1 ring-offset-transparent transition ${tone.mark} ${isActive ? 'ring-2 shadow-sm' : ''}`}
                      tabIndex={0}
                      aria-label={`Resume snippet linked to ${suggestion?.category || 'content'} suggestion`}
                      onMouseEnter={() => setActiveSuggestionId(segment.suggestionId)}
                      onFocus={() => setActiveSuggestionId(segment.suggestionId)}
                      onMouseLeave={() => setActiveSuggestionId((current) => (current === segment.suggestionId ? null : current))}
                      onBlur={() => setActiveSuggestionId((current) => (current === segment.suggestionId ? null : current))}
                    >
                      {segment.text}
                    </mark>
                  );
                })}
              </pre>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                Resume text is unavailable for this analysis. Uploading a file with extractable text enables inline anchors.
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-white/20 bg-white/70 p-4 dark:bg-slate-900/40">
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-600 dark:text-gray-300">
              Improvement Suggestions
            </h4>
            <ul className="mt-3 max-h-[28rem] space-y-3 overflow-auto pr-1" aria-live="polite">
              {suggestions.length === 0 && (
                <li className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  No suggestions available for this analysis yet.
                </li>
              )}

              {suggestions.map((item) => {
                const severity = severityTone[item.severity] || severityTone.medium;
                const category = categoryTone[item.category] || categoryTone.content;
                const isActive = activeSuggestionId === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full rounded-xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-50/80 dark:border-cyan-600 dark:bg-cyan-900/30'
                          : 'border-white/30 bg-white/50 hover:bg-white/80 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:bg-slate-900/60'
                      }`}
                      onClick={() => focusSuggestion(item.id)}
                      onMouseEnter={() => setActiveSuggestionId(item.id)}
                      onFocus={() => setActiveSuggestionId(item.id)}
                      onMouseLeave={() => setActiveSuggestionId((current) => (current === item.id ? null : current))}
                      onBlur={() => setActiveSuggestionId((current) => (current === item.id ? null : current))}
                      aria-label={`Suggestion ${item.category} ${item.severity}. ${item.suggestion}`}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
                        <span className={`rounded-full px-2 py-0.5 ${category}`}>{item.category}</span>
                        <span className={`rounded-full px-2 py-0.5 ${severity.tag}`}>{item.severity}</span>
                        {item.status === 'anchored' && item.lineStart != null && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                            Line {item.lineStart}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.suggestion}</p>

                      {item.referenceText && (
                        <p className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          "{item.referenceText}"
                        </p>
                      )}

                      {item.status !== 'anchored' && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Not mapped to an exact snippet; still relevant for this resume version.
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

export default ResumeImprovementOverlay;
