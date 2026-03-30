import React, { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { adminCardClass, adminFieldClass } from './shared';

const LineChart = ({ data, width = 720, height = 240 }) => {
  const chart = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const margin = { top: 16, right: 24, bottom: 36, left: 52 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const parsed = data.map((item) => ({ ...item, date: new Date(item.date) }));
    const x = d3.scaleTime()
      .domain(d3.extent(parsed, (d) => d.date))
      .range([0, innerWidth]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(parsed, (d) => d.requests) || 1])
      .nice()
      .range([innerHeight, 0]);
    const line = d3.line()
      .x((d) => x(d.date))
      .y((d) => y(d.requests));

    return {
      path: line(parsed) || '',
      xTicks: x.ticks(5).map((tick) => ({ value: x(tick), label: d3.timeFormat('%b %d')(tick) })),
      yTicks: y.ticks(5).map((tick) => ({ value: y(tick), label: tick })),
      margin,
      innerWidth,
      innerHeight,
    };
  }, [data, width, height]);

  if (!chart) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">No time-series data for the current filters.</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <g transform={`translate(${chart.margin.left},${chart.margin.top})`}>
        {chart.yTicks.map((tick) => (
          <g key={`y-${tick.label}`} transform={`translate(0,${tick.value})`}>
            <line x1="0" x2={chart.innerWidth} y1="0" y2="0" stroke="rgba(148,163,184,0.25)" />
            <text x="-10" y="4" textAnchor="end" className="fill-slate-500 text-[10px]">{tick.label}</text>
          </g>
        ))}
        {chart.xTicks.map((tick) => (
          <g key={`x-${tick.label}`} transform={`translate(${tick.value},${chart.innerHeight})`}>
            <line x1="0" x2="0" y1="0" y2="6" stroke="rgba(148,163,184,0.5)" />
            <text y="18" textAnchor="middle" className="fill-slate-500 text-[10px]">{tick.label}</text>
          </g>
        ))}
        <path d={chart.path} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
};

const BarChart = ({ data, labelKey, valueKey, color }) => {
  const width = 720;
  const barHeight = 28;
  const height = Math.max(140, data.length * barHeight + 40);
  const margin = { top: 16, right: 24, bottom: 16, left: 160 };
  const innerWidth = width - margin.left - margin.right;
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, (item) => item[valueKey]) || 1])
    .range([0, innerWidth]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {data.map((item, index) => {
          const y = index * barHeight;
          return (
            <g key={`${item[labelKey]}-${index}`} transform={`translate(0,${y})`}>
              <text x="-12" y="16" textAnchor="end" className="fill-slate-500 text-[11px]">{item[labelKey]}</text>
              <rect x="0" y="4" width={x(item[valueKey])} height="18" rx="6" fill={color} opacity="0.9" />
              <text x={x(item[valueKey]) + 8} y="17" className="fill-slate-600 text-[11px]">{item[valueKey]}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const AdminAnalyticsPage = () => {
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    provider: '',
    model: '',
    feature: '',
    status: '',
    userId: '',
    query: '',
    minTokens: '',
    maxTokens: '',
    minCost: '',
    maxCost: '',
    maxResponseTimeMs: '',
    limit: '100',
  });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getLlmAnalytics(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
      setAnalytics(data);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Failed to load admin analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <section className={adminCardClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">LLM Analytics</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Filter and inspect request volume, spend, provider mix, model usage, and feature distribution.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/analytics/events" className="rounded-2xl border border-slate-300/80 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Usage events
            </Link>
            <input type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} className={adminFieldClass} />
            <input type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} className={adminFieldClass} />
            <input type="text" value={filters.provider} onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))} placeholder="provider" className={adminFieldClass} />
            <input type="text" value={filters.model} onChange={(event) => setFilters((prev) => ({ ...prev, model: event.target.value }))} placeholder="model" className={adminFieldClass} />
            <input type="text" value={filters.feature} onChange={(event) => setFilters((prev) => ({ ...prev, feature: event.target.value }))} placeholder="feature" className={adminFieldClass} />
            <input type="text" value={filters.userId} onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))} placeholder="user ID" className={adminFieldClass} />
            <input type="text" value={filters.query} onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))} placeholder="search" className={adminFieldClass} />
            <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className={adminFieldClass}>
              <option value="">All statuses</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
            </select>
            <input type="number" min="0" value={filters.minTokens} onChange={(event) => setFilters((prev) => ({ ...prev, minTokens: event.target.value }))} placeholder="min tokens" className={adminFieldClass} />
            <input type="number" min="0" value={filters.maxTokens} onChange={(event) => setFilters((prev) => ({ ...prev, maxTokens: event.target.value }))} placeholder="max tokens" className={adminFieldClass} />
            <input type="number" min="0" step="0.0001" value={filters.minCost} onChange={(event) => setFilters((prev) => ({ ...prev, minCost: event.target.value }))} placeholder="min cost" className={adminFieldClass} />
            <input type="number" min="0" step="0.0001" value={filters.maxCost} onChange={(event) => setFilters((prev) => ({ ...prev, maxCost: event.target.value }))} placeholder="max cost" className={adminFieldClass} />
            <input type="number" min="0" value={filters.maxResponseTimeMs} onChange={(event) => setFilters((prev) => ({ ...prev, maxResponseTimeMs: event.target.value }))} placeholder="max latency (ms)" className={adminFieldClass} />
            <input type="number" min="10" max="200" value={filters.limit} onChange={(event) => setFilters((prev) => ({ ...prev, limit: event.target.value }))} placeholder="events limit" className={adminFieldClass} />
            <button type="button" onClick={loadAnalytics} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Apply Filters</button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</div>}

      {loading ? (
        <div className={`${adminCardClass} text-sm text-slate-500 dark:text-slate-400`}>Loading analytics...</div>
      ) : analytics && (
        <>
          <section className={`${adminCardClass} grid gap-4 md:grid-cols-5`}>
            {[
              ['Requests', analytics.overview.requests],
              ['Completed', analytics.overview.completed],
              ['Failed', analytics.overview.failed],
              ['Tokens', analytics.overview.totalTokens],
              ['Cost USD', `$${Number(analytics.overview.totalCostUsd || 0).toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className={`${adminCardClass}`}>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Request Volume Over Time</h3>
            <div className="mt-4">
              <LineChart data={analytics.timeseries} />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className={adminCardClass}>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Provider Spend</h3>
              <div className="mt-4">
                <BarChart data={analytics.providerBreakdown.slice(0, 8)} labelKey="provider" valueKey="totalCostUsd" color="#8b5cf6" />
              </div>
            </div>
            <div className={adminCardClass}>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Top Models By Spend</h3>
              <div className="mt-4">
                <BarChart data={analytics.modelBreakdown.slice(0, 8)} labelKey="model" valueKey="totalCostUsd" color="#06b6d4" />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className={adminCardClass}>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Feature Usage</h3>
              <div className="mt-4">
                <BarChart data={analytics.featureBreakdown.slice(0, 8)} labelKey="feature" valueKey="requestCount" color="#10b981" />
              </div>
            </div>
            <div className={adminCardClass}>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Top Users</h3>
              <div className="mt-4 space-y-3">
                {analytics.userBreakdown.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{user.userId}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.requestCount} requests • {user.totalTokens} tokens</p>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">${Number(user.totalCostUsd || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
