import React, { useState } from 'react';
import ScoreRing from './ScoreRing';
import KeywordAnalysis from './KeywordAnalysis';
import ExperienceRelevance from './ExperienceRelevance';
import FormattingScore from './FormattingScore';
import ActionableAdvice from './ActionableAdvice';
import ResumeImprovementOverlay from './ResumeImprovementOverlay';
import ResumeReviewCanvas from './ResumeReviewCanvas';
import EmptyState from './EmptyState';
import { downloadResumeFile } from '../services/api';

const AnalysisResults = ({ results }) => {
  const [downloadStatus, setDownloadStatus] = useState('');
  const [downloading, setDownloading] = useState(false);

  if (!results) {
    return <EmptyState />;
  }

  const handleDownloadResume = async () => {
    try {
      setDownloading(true);
      setDownloadStatus('Preparing resume download...');
      if (results.resume && results.resume.id) {
        await downloadResumeFile(results.resume.id, results.resume.title || `resume-${results.resume.id}`);
        setDownloadStatus('Resume download started.');
      }
    } catch (error) {
      console.error('Failed to download resume:', error);
      setDownloadStatus('Failed to download the original resume file.');
    } finally {
      setDownloading(false);
    }
  };

  const getScoreText = (score) => {
    if (score >= 80) return { text: 'Excellent', color: 'from-green-400 to-emerald-500' };
    if (score >= 60) return { text: 'Good', color: 'from-yellow-400 to-orange-500' };
    return { text: 'Needs Improvement', color: 'from-red-400 to-pink-500' };
  };

  const scoreInfo = getScoreText(results.overallScore);
  const scoreBreakdown = results.scoringBreakdown;
  const modelUsed = typeof results.modelUsed === 'object' ? results.modelUsed : null;
  const modelName = modelUsed?.name || (typeof results.modelUsed === 'string' ? results.modelUsed : 'Analysis model unavailable');
  const modelProvider = modelUsed?.provider || results.aiProvider || 'Unknown provider';
  const scoringWeights = scoreBreakdown?.weights || {};

  return (
    <div className="space-y-8">
      <div className="glass-strong rounded-3xl p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Model</p>
            <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">{modelName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{modelProvider}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Method</p>
            <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">{results.analysisMethod || 'LLM analysis'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hybrid scoring + grounded recommendations</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Tokens</p>
            <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">{results.tokensUsed || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Prompt {results.promptTokens || 0} / Completion {results.completionTokens || 0}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Estimated Cost</p>
            <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">{results.estimatedCost || 'n/a'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Processing time {results.processingTime || 0} ms</p>
          </div>
        </div>

        {results.analysisWarnings?.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-semibold">Analysis Warnings</p>
            <ul className="mt-2 space-y-1">
              {results.analysisWarnings.map((warning, index) => (
                <li key={index}>- {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {downloadStatus && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300" role="status" aria-live="polite">{downloadStatus}</div>
        )}
      </div>

      {/* Row 1: Overall Match Score and Keyword Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Overall Score */}
        <div className="glass-strong rounded-3xl p-8 hover-glass transition-all duration-300 slide-up">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
              Overall Match Score
            </h3>
            {results.resume && (
              <button
                onClick={handleDownloadResume}
                disabled={downloading}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 min-h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{downloading ? 'Downloading...' : 'Download Resume'}</span>
              </button>
            )}
          </div>
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <ScoreRing score={results.overallScore} />
            </div>
            <div className="text-center space-y-3">
              <div className={`inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r ${scoreInfo.color} text-white font-semibold text-lg shadow-lg`}>
                {scoreInfo.text} Match
              </div>
              <p className="text-gray-600 dark:text-gray-300 max-w-sm mx-auto leading-relaxed">
                Your resume shows a <strong>{scoreInfo.text.toLowerCase()}</strong> alignment with this position.
                {results.overallScore >= 80 && " You're well-positioned for this role!"}
                {results.overallScore >= 60 && results.overallScore < 80 && " Some improvements could boost your chances."}
                {results.overallScore < 60 && " Focus on the suggestions below to improve your match."}
              </p>
            </div>
          </div>
          
          {/* Score breakdown preview */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 glass rounded-2xl">
              <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                {results.skillsAnalysis?.matchedKeywords?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Keywords Found</div>
            </div>
            <div className="text-center p-4 glass rounded-2xl">
              <div className="text-2xl font-bold text-purple-500 dark:text-purple-400">
                {results.formattingScore?.score || 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">ATS Friendly</div>
            </div>
            <div className="text-center p-4 glass rounded-2xl">
              <div className="text-2xl font-bold text-green-500 dark:text-green-400">
                {results.experienceRelevance?.score || 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Experience Relevance</div>
            </div>
          </div>

          {scoreBreakdown && (
            <div className="mt-6 rounded-2xl border border-white/20 bg-white/60 p-4 dark:bg-slate-900/50">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-600 dark:text-gray-300">Scoring Breakdown</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-gray-700 dark:text-gray-200">
                <div>Keyword Score: <span className="font-semibold">{scoreBreakdown.skills}</span> ({Math.round((scoringWeights.skills || 0) * 100)}%)</div>
                <div>Experience Score: <span className="font-semibold">{scoreBreakdown.experience}</span> ({Math.round((scoringWeights.experience || 0) * 100)}%)</div>
                <div>Formatting Score: <span className="font-semibold">{scoreBreakdown.formatting}</span> ({Math.round((scoringWeights.formatting || 0) * 100)}%)</div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Keyword coverage {Math.round((scoreBreakdown.keywordCoverage || 0) * 100)}% • Experience keyword coverage {Math.round((scoreBreakdown.experienceKeywordCoverage || 0) * 100)}%
              </div>
            </div>
          )}
        </div>

        <KeywordAnalysis analysis={results.skillsAnalysis} />
      </div>

      {/* Row 2: Experience Relevance and ATS Formatting Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ExperienceRelevance relevance={results.experienceRelevance} />
        <FormattingScore formatting={results.formattingScore} />
      </div>

      {/* Row 3: Actionable Improvements */}
      <ActionableAdvice advice={results.actionableAdvice} />

      {/* Row 4: Inline resume review overlay */}
      <ResumeImprovementOverlay results={results} />

      {/* Row 5: Document-style review canvas */}
      <ResumeReviewCanvas results={results} />
    </div>
  );
};

export default AnalysisResults;
