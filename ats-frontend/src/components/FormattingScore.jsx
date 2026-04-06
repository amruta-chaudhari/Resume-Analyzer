import React, { useEffect, useState } from 'react';

const FormattingScore = ({ formatting }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const nextScore = Number.isFinite(Number(formatting?.score)) ? Math.max(0, Math.min(100, Number(formatting.score))) : 0;
    const timer = setTimeout(() => {
      setAnimatedScore(nextScore);
    }, 300);
    return () => clearTimeout(timer);
  }, [formatting]);

  if (!formatting || formatting.score == null) {
    return (
      <div className="glass-strong rounded-3xl p-8 hover-glass transition-all duration-300 slide-up">
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">ATS Formatting Analysis</h3>
          <p className="text-gray-500 dark:text-gray-400">Formatting analysis data is not available yet.</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-400 to-emerald-500';
    if (score >= 60) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-pink-500';
  };

  const issues = Array.isArray(formatting.issues) ? formatting.issues : [];
  const suggestions = Array.isArray(formatting.suggestions) ? formatting.suggestions : [];
  const details = formatting.details || null;

  const signalCards = details ? [
    {
      label: 'Contact',
      value: `${details.contact.emailDetected ? 'Email' : 'No email'} • ${details.contact.phoneDetected ? 'Phone' : 'No phone'}`,
      note: details.contact.obfuscatedContactDetected ? 'Obfuscated contact detected' : `Placement: ${details.contact.contactPlacement}`,
    },
    {
      label: 'Sections',
      value: `${details.sections.standardCount} standard`,
      note: `${details.sections.creativeCount} creative • ${details.sections.embeddedCount} embedded`,
    },
    {
      label: 'Layout',
      value: `${details.layout.probableTableLines} table-like`,
      note: `${details.layout.probableMultiColumn ? 'multi-column hint' : 'single-column'} • ${details.layout.extremeIndentation ? 'deep indentation' : 'indentation normal'}`,
    },
    {
      label: 'Dates',
      value: `${details.dates.dateCount} ranges`,
      note: `${details.dates.styles.length ? details.dates.styles.join(', ') : 'No parsed dates'}${details.dates.chronologyIssues > 0 ? ' • chronology issue' : ''}`,
    },
  ] : [];

  return (
    <div className="glass-strong rounded-3xl p-8 hover-glass transition-all duration-300 slide-up">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-xl mr-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          ATS Formatting Score
        </h3>

        <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getScoreColor(formatting.score)} text-white font-bold text-lg`}>
          {animatedScore}%
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>ATS Compatibility</span>
          <span>{animatedScore}% optimized</span>
        </div>
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getScoreColor(formatting.score)} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${animatedScore}%` }}
          />
        </div>
      </div>

      <div className="mb-6 text-center">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
          {formatting.score >= 80 ? 'Strong ATS formatting readiness' : formatting.score >= 60 ? 'Usable formatting with fixable issues' : 'Formatting needs immediate cleanup'}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          Based on deterministic checks for sections, dates, contact placement, layout signals, and parser-friendly structure.
        </p>
      </div>

      {signalCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
          {signalCards.map((card) => (
            <div key={card.label} className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white">{card.value}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.note}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Detected Issues</p>
          <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{issues.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Fix Suggestions</p>
          <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{suggestions.length}</p>
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 dark:text-white">Detected Formatting Issues</h4>
          {issues.map((issue, idx) => (
            <div key={idx} className="p-4 glass rounded-2xl border border-orange-200/50 dark:border-orange-700/50 bg-orange-50/50 dark:bg-orange-900/10">
              <p className="text-orange-700 dark:text-orange-300 font-medium">{issue}</p>
              {suggestions[idx] && (
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">Suggested fix: {suggestions[idx]}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-green-200/50 bg-green-50/50 px-4 py-4 text-sm text-green-700 dark:border-green-700/50 dark:bg-green-900/10 dark:text-green-300">
          No parser-visible ATS formatting issues were detected in the extracted resume text.
        </div>
      )}

      {suggestions.length > issues.length && (
        <div className="mt-6 rounded-2xl border border-blue-200/50 bg-blue-50/50 px-4 py-4 dark:border-blue-700/50 dark:bg-blue-900/10">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300">Additional Improvement Suggestions</h4>
          <ul className="mt-3 space-y-2 text-sm text-blue-700 dark:text-blue-300">
            {suggestions.slice(issues.length).map((suggestion, index) => (
              <li key={index}>- {suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FormattingScore;
