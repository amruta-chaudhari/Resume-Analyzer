import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen animated-bg paper-texture flex items-center justify-center px-4 py-8">
      <div className="glass-strong rounded-3xl p-8 max-w-xl w-full text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Error 404</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">Page not found</h1>
        <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          The page you requested does not exist or the link is outdated.
          Continue to the analysis dashboard or go back to the sign-in page.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard/analysis"
            className="px-5 py-3 btn-glass text-white rounded-xl font-semibold"
          >
            Go to dashboard
          </Link>
          <Link
            to="/login"
            className="px-5 py-3 glass rounded-xl font-semibold text-gray-800 dark:text-gray-100 hover:bg-white/10 transition-colors"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
