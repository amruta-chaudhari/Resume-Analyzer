import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { adminService } from '../../services/adminService';
import {
  adminCardClass,
  adminFieldClass,
  formatDateTime,
  formatAuditChanges,
  parseJsonArrayString,
  normalizeModelListInput,
  roleBadgeClass,
  normalizeUserRole,
} from './shared';

const emptyFormState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  subscriptionTier: 'free',
  role: 'USER',
  emailVerified: false,
  deleted: false,
  llmMonthlyBudgetUsd: '',
  llmMonthlyTokenLimit: '',
  llmMonthlyRequestLimit: '',
  llmAllowReasoning: 'inherit',
  llmAllowedModels: '',
  llmAllowedProviders: '',
  llmOpenRouterKey: '',
  llmOpenAiKey: '',
  llmGeminiKey: '',
  llmAnthropicKey: '',
};

const AdminUserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const currentUser = useAuthStore((state) => state.user);
  const updateCurrentUser = useAuthStore((state) => state.updateUser);

  const [userDetail, setUserDetail] = useState(null);
  const [availablePlans, setAvailablePlans] = useState(['free', 'pro', 'enterprise', 'admin']);
  const [formState, setFormState] = useState(emptyFormState);
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const normalizedRole = useMemo(
    () => normalizeUserRole(userDetail?.user),
    [userDetail]
  );

  const loadUserDetail = async (targetUserId) => {
    if (!targetUserId) {
      setUserDetail(null);
      setFormState(emptyFormState);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const [detail, settings] = await Promise.all([
        adminService.getUser(targetUserId),
        adminService.getSystemSettings(),
      ]);
      const role = normalizeUserRole(detail.user);
      const planKeys = Object.keys(settings?.planLimitsResolved || {});
      if (planKeys.length > 0) {
        setAvailablePlans(planKeys);
      }

      setUserDetail(detail);
      setFormState({
        email: detail.user.email || '',
        firstName: detail.user.firstName || '',
        lastName: detail.user.lastName || '',
        phone: detail.user.phone || '',
        subscriptionTier: detail.user.subscriptionTier || 'free',
        role,
        emailVerified: Boolean(detail.user.emailVerified),
        deleted: Boolean(detail.user.deletedAt),
        llmMonthlyBudgetUsd:
          detail.user.llmMonthlyBudgetUsd == null ? '' : String(detail.user.llmMonthlyBudgetUsd),
        llmMonthlyTokenLimit:
          detail.user.llmMonthlyTokenLimit == null ? '' : String(detail.user.llmMonthlyTokenLimit),
        llmMonthlyRequestLimit:
          detail.user.llmMonthlyRequestLimit == null ? '' : String(detail.user.llmMonthlyRequestLimit),
        llmAllowReasoning:
          detail.user.llmAllowReasoning == null
            ? 'inherit'
            : detail.user.llmAllowReasoning
              ? 'true'
              : 'false',
        llmAllowedModels: parseJsonArrayString(detail.user.llmAllowedModels).join(', '),
        llmAllowedProviders: parseJsonArrayString(detail.user.llmAllowedProviders).join(', '),
        llmOpenRouterKey: '',
        llmOpenAiKey: '',
        llmGeminiKey: '',
        llmAnthropicKey: '',
      });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load user details.');
      setUserDetail(null);
      setFormState(emptyFormState);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserDetail(userId);
  }, [userId]);

  const handleFieldChange = (field, value) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!userId) {
      return;
    }

    setSavingProfile(true);
    setErrorMessage('');
    setSuccessMessage('');

    const budgetValue = formState.llmMonthlyBudgetUsd.trim();
    const tokenValue = formState.llmMonthlyTokenLimit.trim();
    const requestValue = formState.llmMonthlyRequestLimit.trim();

    const parsedBudget = budgetValue === '' ? null : Number(budgetValue);
    const parsedTokenLimit = tokenValue === '' ? null : Number(tokenValue);
    const parsedRequestLimit = requestValue === '' ? null : Number(requestValue);

    if (parsedBudget != null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      setErrorMessage('Monthly budget must be a non-negative number.');
      setSavingProfile(false);
      return;
    }

    if (parsedTokenLimit != null && (!Number.isFinite(parsedTokenLimit) || parsedTokenLimit < 0)) {
      setErrorMessage('Monthly token limit must be a non-negative number.');
      setSavingProfile(false);
      return;
    }

    if (parsedRequestLimit != null && (!Number.isFinite(parsedRequestLimit) || parsedRequestLimit < 0)) {
      setErrorMessage('Monthly request limit must be a non-negative number.');
      setSavingProfile(false);
      return;
    }

    try {
      const payload = {
        email: formState.email,
        firstName: formState.firstName || null,
        lastName: formState.lastName || null,
        phone: formState.phone || null,
        subscriptionTier: formState.subscriptionTier,
        role: formState.role,
        emailVerified: formState.emailVerified,
        deleted: formState.deleted,
        llmMonthlyBudgetUsd: parsedBudget,
        llmMonthlyTokenLimit: parsedTokenLimit == null ? null : Math.floor(parsedTokenLimit),
        llmMonthlyRequestLimit: parsedRequestLimit == null ? null : Math.floor(parsedRequestLimit),
        llmAllowReasoning:
          formState.llmAllowReasoning === 'inherit'
            ? null
            : formState.llmAllowReasoning === 'true',
        llmAllowedModels: normalizeModelListInput(formState.llmAllowedModels),
        llmAllowedProviders: normalizeModelListInput(formState.llmAllowedProviders),
        llmOpenRouterKey: formState.llmOpenRouterKey.trim() || undefined,
        llmOpenAiKey: formState.llmOpenAiKey.trim() || undefined,
        llmGeminiKey: formState.llmGeminiKey.trim() || undefined,
        llmAnthropicKey: formState.llmAnthropicKey.trim() || undefined,
      };

      await adminService.updateUser(userId, payload);
      await loadUserDetail(userId);

      if (userId === currentUser?.id) {
        updateCurrentUser({
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          subscriptionTier: payload.subscriptionTier,
          role: payload.role,
        });
      }

      setSuccessMessage('User profile updated.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update user.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!userId) {
      return;
    }

    setUpdatingPassword(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await adminService.setUserPassword(userId, newPassword);
      setNewPassword('');
      await loadUserDetail(userId);
      setSuccessMessage(`Password updated and ${result.revokedSessions} session(s) revoked.`);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!userId) {
      return;
    }

    setRevokingSessions(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await adminService.revokeUserSessions(userId);
      await loadUserDetail(userId);
      setSuccessMessage(`${result.revokedSessions} active session(s) revoked.`);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to revoke sessions.');
    } finally {
      setRevokingSessions(false);
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (!window.confirm('Delete this resume from the user library?')) {
      return;
    }

    try {
      setErrorMessage('');
      setSuccessMessage('');
      await adminService.deleteUserResume(userId, resumeId);
      await loadUserDetail(userId);
      setSuccessMessage('Resume deleted.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete resume.');
    }
  };

  const handleDeleteJobDescription = async (jobDescriptionId) => {
    if (!window.confirm('Delete this job description from the user library?')) {
      return;
    }

    try {
      setErrorMessage('');
      setSuccessMessage('');
      await adminService.deleteUserJobDescription(userId, jobDescriptionId);
      await loadUserDetail(userId);
      setSuccessMessage('Job description deleted.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete job description.');
    }
  };

  if (loading) {
    return (
      <div className={`${adminCardClass} text-center text-sm text-slate-500 dark:text-slate-400`}>
        Loading selected user...
      </div>
    );
  }

  if (!userDetail) {
    return (
      <div className="space-y-4">
        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <div className={`${adminCardClass} text-center text-sm text-slate-500 dark:text-slate-400`}>
          User not found or unavailable.
        </div>

        <div>
          <Link
            to="/admin/users"
            className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back To User Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back To User Directory
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
          {successMessage}
        </div>
      )}

      <section className={adminCardClass}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{userDetail.user.email}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Created {formatDateTime(userDetail.user.createdAt)} - Last login {formatDateTime(userDetail.user.lastLoginAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeClass[normalizedRole] || roleBadgeClass.USER}`}>
              {normalizedRole}
            </span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {userDetail.user.subscriptionTier}
            </span>
            {userDetail.user.deletedAt && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                Soft Deleted
              </span>
            )}
            {userDetail.user.emailVerified && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-200">
                Email Verified
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Resumes</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.user.counts.resumes}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Analyses</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.user.counts.analyses}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Job Descriptions</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.user.counts.jobDescriptions}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">AI Usage</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.user.counts.aiUsage}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Sessions</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.user.counts.refreshSessions}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Analyses Today</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.user.analysesRunToday}</p>
          </div>
        </div>

        {userDetail.usageSummary && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Monthly Requests</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.usageSummary.totals.requestCount}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Remaining {userDetail.usageSummary.remaining.monthlyRequestLimit ?? 'Unlimited'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Monthly Tokens</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{userDetail.usageSummary.totals.totalTokens}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Remaining {userDetail.usageSummary.remaining.monthlyTokenLimit ?? 'Unlimited'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Monthly Spend</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">${Number(userDetail.usageSummary.totals.totalCostUsd || 0).toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Remaining {userDetail.usageSummary.remaining.monthlyBudgetUsd == null ? 'Unlimited' : `$${Number(userDetail.usageSummary.remaining.monthlyBudgetUsd).toFixed(2)}`}</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSaveProfile} className={adminCardClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Profile And Access Controls</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enterprise controls for identity, access, and per-user LLM policy overrides.</p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Email
              <input
                type="email"
                value={formState.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Phone
              <input
                type="text"
                value={formState.phone}
                onChange={(event) => handleFieldChange('phone', event.target.value)}
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              First Name
              <input
                type="text"
                value={formState.firstName}
                onChange={(event) => handleFieldChange('firstName', event.target.value)}
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Last Name
              <input
                type="text"
                value={formState.lastName}
                onChange={(event) => handleFieldChange('lastName', event.target.value)}
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Subscription Tier
              <select
                value={formState.subscriptionTier}
                onChange={(event) => handleFieldChange('subscriptionTier', event.target.value)}
                className={adminFieldClass}
              >
                {availablePlans.map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Role
              <select
                value={formState.role}
                onChange={(event) => handleFieldChange('role', event.target.value)}
                className={adminFieldClass}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Monthly LLM Budget Override (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.llmMonthlyBudgetUsd}
                onChange={(event) => handleFieldChange('llmMonthlyBudgetUsd', event.target.value)}
                placeholder="Empty = inherit from plan"
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Monthly Token Limit Override
              <input
                type="number"
                min="0"
                step="1"
                value={formState.llmMonthlyTokenLimit}
                onChange={(event) => handleFieldChange('llmMonthlyTokenLimit', event.target.value)}
                placeholder="Empty = inherit from plan"
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Monthly Request Limit Override
              <input
                type="number"
                min="0"
                step="1"
                value={formState.llmMonthlyRequestLimit}
                onChange={(event) => handleFieldChange('llmMonthlyRequestLimit', event.target.value)}
                placeholder="Empty = inherit from plan"
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
              Allowed Models Override (comma separated model IDs)
              <input
                type="text"
                value={formState.llmAllowedModels}
                onChange={(event) => handleFieldChange('llmAllowedModels', event.target.value)}
                placeholder="openai/gpt-4o-mini, anthropic/claude-3.5-sonnet"
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
              Allowed Providers Override (comma separated provider IDs)
              <input
                type="text"
                value={formState.llmAllowedProviders}
                onChange={(event) => handleFieldChange('llmAllowedProviders', event.target.value)}
                placeholder="openrouter, openai, gemini, anthropic"
                className={adminFieldClass}
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Reasoning Access Override
              <select
                value={formState.llmAllowReasoning}
                onChange={(event) => handleFieldChange('llmAllowReasoning', event.target.value)}
                className={adminFieldClass}
              >
                <option value="inherit">Inherit plan default</option>
                <option value="true">Allow reasoning</option>
                <option value="false">Disallow reasoning</option>
              </select>
            </label>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Account State</p>
              <label className="mt-4 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formState.emailVerified}
                  onChange={(event) => handleFieldChange('emailVerified', event.target.checked)}
                />
                Email verified
              </label>
              <label className="mt-3 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formState.deleted}
                  onChange={(event) => handleFieldChange('deleted', event.target.checked)}
                />
                Soft delete account
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/60 md:col-span-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Per-User Provider Keys</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">If a user-specific key is set, it is used before the global/provider env key.</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  OpenRouter Key
                  <input
                    type="password"
                    value={formState.llmOpenRouterKey}
                    onChange={(event) => handleFieldChange('llmOpenRouterKey', event.target.value)}
                    placeholder={userDetail.user.openRouterKeyMasked || 'Set per-user OpenRouter key'}
                    className={adminFieldClass}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  OpenAI Key
                  <input
                    type="password"
                    value={formState.llmOpenAiKey}
                    onChange={(event) => handleFieldChange('llmOpenAiKey', event.target.value)}
                    placeholder={userDetail.user.openAiKeyMasked || 'Set per-user OpenAI key'}
                    className={adminFieldClass}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Gemini Key
                  <input
                    type="password"
                    value={formState.llmGeminiKey}
                    onChange={(event) => handleFieldChange('llmGeminiKey', event.target.value)}
                    placeholder={userDetail.user.geminiKeyMasked || 'Set per-user Gemini key'}
                    className={adminFieldClass}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Anthropic Key
                  <input
                    type="password"
                    value={formState.llmAnthropicKey}
                    onChange={(event) => handleFieldChange('llmAnthropicKey', event.target.value)}
                    placeholder={userDetail.user.anthropicKeyMasked || 'Set per-user Anthropic key'}
                    className={adminFieldClass}
                  />
                </label>
              </div>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <form onSubmit={handleResetPassword} className={adminCardClass}>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Password Reset</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Passwords are never viewable. Set a replacement and revoke active sessions immediately.
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                className={adminFieldClass}
              />
            </label>
            <button
              type="submit"
              disabled={updatingPassword || !newPassword}
              className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingPassword ? 'Updating Password...' : 'Set New Password'}
            </button>
          </form>

          <div className={adminCardClass}>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Session Security</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Force sign-out from all refresh sessions to contain suspicious access quickly.
            </p>
            <button
              type="button"
              onClick={handleRevokeSessions}
              disabled={revokingSessions}
              className="mt-4 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {revokingSessions ? 'Revoking Sessions...' : 'Revoke All Sessions'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {userDetail.usageSummary && (
          <div className={adminCardClass}>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Provider Spend And Limits</h3>
            <div className="mt-4 space-y-3">
              {userDetail.usageSummary.providerBreakdown.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No provider usage recorded for this billing window.</p>
              )}
              {userDetail.usageSummary.providerBreakdown.map((provider) => (
                <div key={provider.provider} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{provider.provider}</p>
                    <p className="font-semibold text-slate-900 dark:text-white">${Number(provider.totalCostUsd || 0).toFixed(2)}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{provider.requestCount} requests • {provider.totalTokens} tokens</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={adminCardClass}>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Analyses</h3>
          <div className="mt-4 space-y-3">
            {userDetail.recentAnalyses.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No analyses recorded.</p>
            )}
            {userDetail.recentAnalyses.map((analysis) => (
              <div key={analysis.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{analysis.analysisType}</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{analysis.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {analysis.aiProvider || 'Unknown provider'} / {analysis.modelUsed || 'Unknown model'}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Created {formatDateTime(analysis.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={adminCardClass}>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Resume Activity</h3>
          <div className="mt-4 space-y-3">
            {userDetail.recentResumes.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No resumes recorded.</p>
            )}
            {userDetail.recentResumes.map((resume) => (
              <div key={resume.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{resume.title}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{resume.status}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteResume(resume.id)}
                      className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Updated {formatDateTime(resume.updatedAt)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={adminCardClass}>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Job Descriptions</h3>
          <div className="mt-4 space-y-3">
            {userDetail.recentJobDescriptions.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No job descriptions recorded.</p>
            )}
            {userDetail.recentJobDescriptions.map((jobDescription) => (
              <div key={jobDescription.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{jobDescription.title}</p>
                  <button
                    type="button"
                    onClick={() => handleDeleteJobDescription(jobDescription.id)}
                    className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-200"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {jobDescription.company || 'No company'} - {jobDescription.location || 'No location'}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Updated {formatDateTime(jobDescription.updatedAt)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={adminCardClass}>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Sessions And AI Usage</h3>
          <div className="mt-4 space-y-3">
            {userDetail.recentSessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="font-semibold text-slate-900 dark:text-white">Session {session.id.slice(0, 8)}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Created {formatDateTime(session.createdAt)} - Expires {formatDateTime(session.expiresAt)}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {session.revokedAt ? `Revoked ${formatDateTime(session.revokedAt)}` : 'Active until revoked or expired'}
                </p>
              </div>
            ))}

            {userDetail.recentAiUsage.map((usage) => (
              <div key={usage.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{usage.feature}</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{usage.aiProvider}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {usage.tokensUsed || 0} tokens - Cost {usage.estimatedCost || 'n/a'} - {usage.responseTimeMs || 0} ms
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Logged {formatDateTime(usage.createdAt)}</p>
              </div>
            ))}

            {userDetail.recentSessions.length === 0 && userDetail.recentAiUsage.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent sessions or AI usage recorded.</p>
            )}
          </div>
        </div>
      </section>

      <section className={adminCardClass}>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Audit Trail</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Immutable event history for administrative actions and user-impacting changes.</p>
        <div className="mt-4 space-y-4">
          {userDetail.recentAuditLogs.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No audit trail entries recorded yet.</p>
          )}

          {userDetail.recentAuditLogs.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{entry.action}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Entity {entry.entityType || 'n/a'} / {entry.entityId || 'n/a'} - Actor {entry.userId || 'unknown'}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(entry.createdAt)}</p>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-cyan-100">
                {formatAuditChanges(entry.changes)}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminUserDetailPage;
