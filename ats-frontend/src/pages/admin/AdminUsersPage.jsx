import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import {
  adminCardClass,
  adminFieldClass,
  formatDateTime,
  getVisiblePageNumbers,
  roleBadgeClass,
  normalizeUserRole,
} from './shared';

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const totalUsers = pagination?.total || 0;
  const totalPages = Math.max(1, pagination?.totalPages || 1);
  const activePage = pagination?.page || currentPage;
  const activePageSize = pagination?.pageSize || pageSize;
  const firstVisibleUserIndex = totalUsers === 0 ? 0 : ((activePage - 1) * activePageSize) + 1;
  const lastVisibleUserIndex = totalUsers === 0 ? 0 : Math.min(totalUsers, firstVisibleUserIndex + users.length - 1);

  const visiblePageNumbers = useMemo(
    () => getVisiblePageNumbers(activePage, totalPages),
    [activePage, totalPages]
  );

  const loadUsers = async ({ searchValue = deferredSearch, pageValue = currentPage, pageSizeValue = pageSize } = {}) => {
    setLoadingUsers(true);
    setErrorMessage('');

    try {
      const result = await adminService.listUsers({
        search: searchValue || undefined,
        page: pageValue,
        pageSize: pageSizeValue,
      });

      if (result.pagination && pageValue > result.pagination.totalPages) {
        setCurrentPage(result.pagination.totalPages);
        return;
      }

      setUsers(result.users);
      setPagination(result.pagination);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load users.');
      setUsers([]);
      setPagination(null);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers({
      searchValue: deferredSearch,
      pageValue: currentPage,
      pageSizeValue: pageSize,
    });
  }, [deferredSearch, currentPage, pageSize]);

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }

    setCurrentPage(nextPage);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className={`${adminCardClass} h-fit xl:sticky xl:top-6`}>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="admin-search">
          Search users
        </label>
        <input
          id="admin-search"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Email, name, phone"
          className={adminFieldClass}
        />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {pagination
            ? totalUsers === 0
              ? 'No users found'
              : `Showing ${firstVisibleUserIndex}-${lastVisibleUserIndex} of ${totalUsers} user(s)`
            : 'Search the full user directory'}
        </p>

        <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Directory</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Page</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{activePage}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="space-y-4">
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <section className={adminCardClass}>
          <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">User Directory</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enterprise-grade user inventory with quick role/tier visibility and one-click drill-down.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {loadingUsers && (
              <div className="rounded-2xl border border-dashed border-slate-300/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Loading users...
              </div>
            )}

            {!loadingUsers && users.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No users match this search.
              </div>
            )}

            {!loadingUsers && users.map((user) => {
              const role = normalizeUserRole(user);

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-50/40 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-cyan-600 dark:hover:bg-slate-800/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.email}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name set'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${roleBadgeClass[role] || roleBadgeClass.USER}`}>
                        {role}
                      </span>
                      <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                        {user.subscriptionTier}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div>Analyses: {user.counts.analyses}</div>
                    <div>Sessions: {user.counts.refreshSessions}</div>
                    <div>Resumes: {user.counts.resumes}</div>
                    <div>AI Usage: {user.counts.aiUsage}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {user.deletedAt && <span className="rounded-full bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-200">Deleted</span>}
                    {user.emailVerified && <span className="rounded-full bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900/40 dark:text-green-200">Verified</span>}
                    <span>Last login: {formatDateTime(user.lastLoginAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {!loadingUsers && pagination && (
            <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value) || 25);
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-slate-300/70 bg-white px-2 py-1 text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <span>Page {activePage} of {totalPages}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(activePage - 1)}
                  disabled={activePage <= 1}
                  className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Previous
                </button>

                {visiblePageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      pageNumber === activePage
                        ? 'border-cyan-500 bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200'
                        : 'border-slate-300/80 bg-white text-slate-700 hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handlePageChange(activePage + 1)}
                  disabled={activePage >= totalPages}
                  className="rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminUsersPage;
