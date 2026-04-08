import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen animated-bg paper-texture px-4 py-10">
      <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-8 space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Policy</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Privacy policy</h1>
          <p className="mt-3 text-gray-700 dark:text-gray-300">Updated: April 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">What we store</h2>
          <p className="text-gray-700 dark:text-gray-300">We store account details, resumes, job descriptions, and analysis history so you can manage and improve your applications.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">How data is used</h2>
          <p className="text-gray-700 dark:text-gray-300">Uploaded resume and job-description content is processed to generate ATS analysis and recommendations.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your controls</h2>
          <p className="text-gray-700 dark:text-gray-300">You can delete resumes, job descriptions, and analyses from your account. Contact support if you need account deletion assistance.</p>
        </section>

        <div className="pt-4">
          <Link to="/dashboard/analysis" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
