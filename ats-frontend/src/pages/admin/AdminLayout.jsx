import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useTheme from '../../hooks/useTheme';
import { adminCardClass } from './shared';

const navClass = ({ isActive }) =>
  `rounded-xl px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

const AdminLayout = () => {
  useTheme();
  const currentUser = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <section className={`${adminCardClass} relative overflow-hidden`}>
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-600/15" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-700/15" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
                Enterprise Admin Console
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                User Operations
              </h1>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                Multi-page governance workspace for identity, access, security controls, AI policy,
                and operational observability.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200/70 bg-white/85 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                Signed in as <span className="font-semibold">{currentUser?.email || 'admin'}</span>
              </div>
              <Link
                to="/dashboard/analysis"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back To Dashboard
              </Link>
            </div>
          </div>

          <div className="relative mt-7 overflow-x-auto">
            <div className="inline-flex min-w-max rounded-2xl border border-slate-200/80 bg-white/90 p-1 dark:border-slate-700 dark:bg-slate-900/80">
              <NavLink to="/admin/users" className={navClass}>
                User Management
              </NavLink>
              <NavLink to="/admin/system" className={navClass}>
                System Configuration
              </NavLink>
              <NavLink to="/admin/analytics" className={navClass}>
                LLM Analytics
              </NavLink>
              <NavLink to="/admin/analytics/events" className={navClass}>
                Usage Events
              </NavLink>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
