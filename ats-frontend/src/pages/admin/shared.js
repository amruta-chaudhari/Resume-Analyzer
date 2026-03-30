export const adminCardClass =
  'rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70';

export const adminFieldClass =
  'mt-2 w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500';

export const roleBadgeClass = {
  ADMIN: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  USER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

export const formatDateTime = (value) => {
  if (!value) {
    return 'Never';
  }

  try {
    return new Date(value).toLocaleString();
  } catch (_error) {
    return String(value);
  }
};

export const getVisiblePageNumbers = (currentPage, totalPages) => {
  const maxButtons = 5;

  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - halfWindow);
  let end = Math.min(totalPages, start + maxButtons - 1);

  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export const parseJsonArrayString = (value) => {
  if (!value || typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const normalizeModelListInput = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const values = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return null;
  }

  return JSON.stringify(Array.from(new Set(values)));
};

export const formatAuditChanges = (changes) => {
  if (!changes) {
    return 'No audit payload';
  }

  if (typeof changes === 'string') {
    return changes;
  }

  return JSON.stringify(changes, null, 2);
};

export const normalizeUserRole = (user) => {
  if (user?.role === 'ADMIN') {
    return 'ADMIN';
  }

  if ((user?.subscriptionTier || '').toLowerCase() === 'admin') {
    return 'ADMIN';
  }

  return 'USER';
};
