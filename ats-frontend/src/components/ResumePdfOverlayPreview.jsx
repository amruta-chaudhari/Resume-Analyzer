import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Info, LoaderCircle } from 'lucide-react';
import { getResumeOverlayPdfSource } from '../services/api';
import { buildOverlaySearchIndex, resolveOverlayAnchors } from './resumePdfOverlay';

let pdfJsPromise;

const loadPdfJs = async () => {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      }

      return pdfjs;
    });
  }

  return pdfJsPromise;
};

const buildTextBoxes = (items, viewport, Util) => items
  .filter((item) => typeof item?.str === 'string')
  .map((item) => {
    const transform = Util.transform(viewport.transform, item.transform);
    const height = Math.max(
      Math.abs(item.height || 0) * viewport.scale,
      Math.abs(transform[3])
    );
    const width = Math.max(Math.abs(item.width || 0) * viewport.scale, 1);

    return {
      text: item.str,
      left: transform[4],
      top: transform[5] - height,
      width,
      height,
    };
  })
  .filter((item) => item.text?.trim());

const ResumePdfOverlayPreview = ({
  resumeId,
  suggestions,
  activeSuggestionId,
  onFocusSuggestion,
  onHoverSuggestion,
  onClearHover,
  fallback,
}) => {
  const previewRef = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [renderState, setRenderState] = useState({
    status: 'idle',
    pages: [],
    sourceLabel: null,
    error: null,
  });

  const anchoredSuggestions = useMemo(
    () => (suggestions || []).filter((item) => item.status === 'anchored'),
    [suggestions]
  );

  useEffect(() => {
    const node = previewRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const updateWidth = () => {
      const nextWidth = Math.floor(node.clientWidth || 0);
      if (nextWidth > 0) {
        setPreviewWidth(nextWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!resumeId || anchoredSuggestions.length === 0 || previewWidth === 0) {
      setRenderState((current) => ({
        ...current,
        status: 'fallback',
      }));
      return undefined;
    }

    let cancelled = false;

    const renderPreview = async () => {
      try {
        setRenderState({
          status: 'loading',
          pages: [],
          sourceLabel: null,
          error: null,
        });

        const pdfjs = await loadPdfJs();
        const source = await getResumeOverlayPdfSource(resumeId);
        const arrayBuffer = await source.blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDocument = await loadingTask.promise;
        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(2, Math.max(1.1, (previewWidth - 24) / baseViewport.width));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            throw new Error('Canvas rendering is not available in this browser.');
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: context, viewport }).promise;

          const textContent = await page.getTextContent();
          const textBoxes = buildTextBoxes(textContent.items, viewport, pdfjs.Util);

          pages.push({
            pageNumber,
            width: viewport.width,
            height: viewport.height,
            imageSrc: canvas.toDataURL('image/png'),
            textBoxes,
            searchIndex: buildOverlaySearchIndex(textBoxes),
          });
        }

        const anchors = resolveOverlayAnchors(pages, anchoredSuggestions);
        const pagesWithAnchors = pages.map((page) => ({
          ...page,
          anchors: anchors.filter((anchor) => anchor.pageNumber === page.pageNumber),
        }));

        if (!cancelled) {
          setRenderState({
            status: anchors.length > 0 ? 'ready' : 'fallback',
            pages: pagesWithAnchors,
            sourceLabel: source.label,
            error: anchors.length > 0 ? null : 'No page-level overlay anchors could be resolved for this resume preview.',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setRenderState({
            status: 'fallback',
            pages: [],
            sourceLabel: null,
            error: error instanceof Error ? error.message : 'Failed to render the resume overlay preview.',
          });
        }
      }
    };

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [anchoredSuggestions, previewWidth, resumeId]);

  const suggestionMap = useMemo(() => new Map(suggestions.map((item) => [item.id, item])), [suggestions]);

  if (renderState.status === 'loading') {
    return (
      <div ref={previewRef} className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/70 shadow-inner dark:bg-slate-950/40">
        <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Rendered Resume Overlay</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Preparing real page previews for inline review markers.</p>
        </div>
        <div className="flex min-h-[22rem] items-center justify-center gap-3 p-8 text-sm text-slate-600 dark:text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Rendering the real resume pages...
        </div>
      </div>
    );
  }

  if (renderState.status !== 'ready') {
    return (
      <div ref={previewRef}>
        {renderState.error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{renderState.error}</p>
          </div>
        )}
        {fallback}
      </div>
    );
  }

  return (
    <div ref={previewRef} className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/70 shadow-inner dark:bg-slate-950/40">
      <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Rendered Resume Overlay</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Hover the numbered info markers placed directly on the real resume pages.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            {renderState.sourceLabel}
          </span>
        </div>
      </div>

      <div className="max-h-[44rem] overflow-auto bg-gradient-to-b from-slate-50 to-white p-5 dark:from-slate-950 dark:to-slate-950/80 sm:p-7">
        <div className="mx-auto max-w-4xl space-y-6">
          {renderState.pages.map((page) => (
            <div key={page.pageNumber} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-5">
              <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <span>Page {page.pageNumber}</span>
                <span>{page.anchors.length} overlays</span>
              </div>

              <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-inner dark:border-slate-800 dark:bg-slate-950">
                <img
                  src={page.imageSrc}
                  alt={`Resume page ${page.pageNumber}`}
                  className="block h-auto w-full"
                />

                {page.anchors.map((anchor) => {
                  const suggestion = suggestionMap.get(anchor.suggestionId);
                  const isActive = activeSuggestionId === anchor.suggestionId;

                  return (
                    <React.Fragment key={anchor.suggestionId}>
                      <div
                        className={`absolute rounded-xl border-2 transition ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-300/15 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]'
                            : 'border-cyan-300/70 bg-cyan-300/10'
                        }`}
                        style={{
                          left: `${anchor.leftPct}%`,
                          top: `${anchor.topPct}%`,
                          width: `${anchor.widthPct}%`,
                          height: `${anchor.heightPct}%`,
                        }}
                      />

                      <button
                        type="button"
                        className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                          isActive
                            ? 'border-cyan-400 bg-cyan-500'
                            : 'border-slate-900 bg-slate-900/90 hover:bg-cyan-500 dark:border-slate-100 dark:bg-slate-100/90 dark:text-slate-900'
                        }`}
                        style={{
                          left: `${anchor.iconLeftPct}%`,
                          top: `${anchor.iconTopPct}%`,
                        }}
                        aria-label={`Open overlay suggestion ${suggestion?.ordinal || ''} on page ${page.pageNumber}`}
                        onClick={() => onFocusSuggestion(anchor.suggestionId)}
                        onMouseEnter={() => onHoverSuggestion(anchor.suggestionId)}
                        onFocus={() => onHoverSuggestion(anchor.suggestionId)}
                        onMouseLeave={onClearHover}
                        onBlur={onClearHover}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>

                      {isActive && suggestion && (
                        <div
                          className="absolute z-20 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-3 text-left shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-950/95"
                          style={{
                            left: `${anchor.iconLeftPct}%`,
                            top: `${Math.min(anchor.iconTopPct + 6, 92)}%`,
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                            <span>Page {page.pageNumber}</span>
                            {suggestion.anchorSection && <span>{suggestion.anchorSection}</span>}
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{suggestion.suggestion}</p>
                          {anchor.matchedText && (
                            <p className="mt-2 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              "{anchor.matchedText}"
                            </p>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumePdfOverlayPreview;
