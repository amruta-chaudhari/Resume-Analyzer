import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { adminCardClass, adminFieldClass, formatDateTime } from './shared';

const numberFieldClass = `${adminFieldClass} mt-0`;

const getQueryParams = (filters) => Object.fromEntries(
  Object.entries(filters)
    .filter(([, value]) => value !== '' && value != null)
    .map(([key, value]) => [key, value])
);

const initialFilters = {
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
};

const AdminUsageEventsPage = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [events, setEvents] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasEvents = events.length > 0;

  const statusStats = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      const key = (event.status || 'unknown').toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = getQueryParams(filters);
      const data = await adminService.getLlmAnalytics(params);
      setEvents(data.events || []);
      setOverview(data.overview || null);
    } catch (loadError) {
      setEvents([]);
      setOverview(null);
      setError(loadError.message || 'Failed to load usage events.');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setEvents([]);
    setOverview(null);
    setError('');
  };

  return (
    <div className="space-y-6">
      <section className={adminCardClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Usage Events Explorer</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Investigate LLM usage with fine-grained filters across provider, model, user, tokens, latency, and cost.
            </p>
          </div>
          <Link
            to="/admin/analytics"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Open charts dashboard
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} className={numberFieldClass} />
          <input type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} className={numberFieldClass} />
          <input type="text" value={filters.provider} onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))} placeholder="Provider" className={numberFieldClass} />
          <input type="text" value={filters.model} onChange={(event) => setFilters((prev) => ({ ...prev, model: event.target.value }))} placeholder="Model" className={numberFieldClass} />
          <input type="text" value={filters.feature} onChange={(event) => setFilters((prev) => ({ ...prev, feature: event.target.value }))} placeholder="Feature" className={numberFieldClass} />
          <input type="text" value={filters.userId} onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))} placeholder="User ID" className={numberFieldClass} />
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className={numberFieldClass}>
            <option value="">All statuses</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
          <input type="text" value={filters.query} onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))} placeholder="Search text" className={numberFieldClass} />
          <input type="number" min="0" value={filters.minTokens} onChange={(event) => setFilters((prev) => ({ ...prev, minTokens: event.target.value }))} placeholder="Min tokens" className={numberFieldClass} />
          <input type="number" min="0" value={filters.maxTokens} onChange={(event) => setFilters((prev) => ({ ...prev, maxTokens: event.target.value }))} placeholder="Max tokens" className={numberFieldClass} />
          <input type="number" min="0" step="0.0001" value={filters.minCost} onChange={(event) => setFilters((prev) => ({ ...prev, minCost: event.target.value }))} placeholder="Min cost USD" className={numberFieldClass} />
          <input type="number" min="0" step="0.0001" value={filters.maxCost} onChange={(event) => setFilters((prev) => ({ ...prev, maxCost: event.target.value }))} placeholder="Max cost USD" className={numberFieldClass} />
          <input type="number" min="0" value={filters.maxResponseTimeMs} onChange={(event) => setFilters((prev) => ({ ...prev, maxResponseTimeMs: event.target.value }))} placeholder="Max latency ms" className={numberFieldClass} />
          <input type="number" min="10" max="200" value={filters.limit} onChange={(event) => setFilters((prev) => ({ ...prev, limit: event.target.value }))} placeholder="Event limit (10-200)" className={numberFieldClass} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            {loading ? 'Loading...' : 'Apply filters'}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            disabled={loading}
            className="rounded-xl border border-slate-300/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Reset
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {overview && (
        <section className={`${adminCardClass} grid gap-4 sm:grid-cols-2 xl:grid-cols-5`}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Requests</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{overview.requests || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Completed</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{overview.completed || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Failed</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{overview.failed || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Tokens</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{overview.totalTokens || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Avg latency</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{overview.avgLatencyMs || 0} ms</p>
          </div>
        </section>
      )}

      <section className={adminCardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Recent usage events</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{hasEvents ? `${events.length} event(s)` : 'No event data loaded yet.'}</p>
        </div>

        {statusStats.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {statusStats.map(([status, count]) => (
              <span key={status} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {status}: {count}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">User</th>
                <th className="px-3 py-2 font-semibold">Provider</th>
                <th className="px-3 py-2 font-semibold">Model</th>
                <th className="px-3 py-2 font-semibold">Feature</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Tokens</th>
                <th className="px-3 py-2 font-semibold">Cost</th>
                <th className="px-3 py-2 font-semibold">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((eventRow) => (
                <tr key={eventRow.id} className="align-top text-slate-700 dark:text-slate-200">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(eventRow.createdAt)}</td>
                  <td className="px-3 py-2">
                    <span className="block max-w-[180px] truncate font-mono text-xs">{eventRow.userId}</span>
                  </td>
                  <td className="px-3 py-2">{eventRow.provider}</td>
                  <td className="px-3 py-2">
                    <span className="block max-w-[240px] truncate">{eventRow.model}</span>
                  </td>
                  <td className="px-3 py-2">{eventRow.feature}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${String(eventRow.status).toLowerCase() === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'}`}>
                      {eventRow.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{eventRow.tokensUsed}</td>
                  <td className="px-3 py-2">${Number(eventRow.costUsd || 0).toFixed(6)}</td>
                  <td className="px-3 py-2">{eventRow.responseTimeMs || 0} ms</td>
                </tr>
              ))}

              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Run a filtered query to inspect LLM usage events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminUsageEventsPage;
