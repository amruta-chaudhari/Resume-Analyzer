import React, { useEffect, useState } from 'react';
import { getUsageSummary } from '../services/api';

const formatLimit = (value, suffix = '') => (value == null ? 'Unlimited' : `${value}${suffix}`);
const formatUsd = (value) => (value == null ? 'Unlimited' : `$${Number(value).toFixed(2)}`);

const UsageSummaryCard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getUsageSummary();
        setSummary(data);
        setError('');
      } catch (loadError) {
        setError(loadError.message || 'Failed to load usage summary.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="glass-strong rounded-3xl p-6 text-sm text-gray-500 dark:text-gray-400">Loading usage summary...</div>;
  }

  if (error) {
    return <div className="glass-strong rounded-3xl p-6 text-sm text-red-600 dark:text-red-300">{error}</div>;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="glass-strong rounded-3xl p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly LLM Usage</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Track requests, token consumption, and spend against your current per-user plan limits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Requests</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary.totals.requestCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Remaining {formatLimit(summary.remaining.monthlyRequestLimit)} / Limit {formatLimit(summary.limits.monthlyRequestLimit)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Tokens</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary.totals.totalTokens}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Remaining {formatLimit(summary.remaining.monthlyTokenLimit)} / Limit {formatLimit(summary.limits.monthlyTokenLimit)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Spend</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatUsd(summary.totals.totalCostUsd)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Remaining {formatUsd(summary.remaining.monthlyBudgetUsd)} / Limit {formatUsd(summary.limits.monthlyBudgetUsd)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Provider Breakdown</h3>
          <div className="mt-4 space-y-3">
            {summary.providerBreakdown.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No provider usage recorded this month.</p>
            )}
            {summary.providerBreakdown.map((provider) => (
              <div key={provider.provider} className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/50 px-4 py-3 dark:bg-slate-900/40">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{provider.provider}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {provider.requestCount} requests • {provider.totalTokens} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{formatUsd(provider.totalCostUsd)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{provider.completedRequests} completed</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Breakdown</h3>
          <div className="mt-4 space-y-3">
            {summary.featureBreakdown.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No feature usage recorded this month.</p>
            )}
            {summary.featureBreakdown.map((feature) => (
              <div key={feature.feature} className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/50 px-4 py-3 dark:bg-slate-900/40">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{feature.feature}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{feature.requestCount} requests • {feature.totalTokens} tokens</p>
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{formatUsd(feature.totalCostUsd)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageSummaryCard;
