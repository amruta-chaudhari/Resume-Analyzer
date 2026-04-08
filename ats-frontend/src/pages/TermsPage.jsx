import React from 'react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="min-h-screen animated-bg paper-texture px-4 py-10">
      <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-8 space-y-6">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Policy</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Terms of service</h1>
          <p className="mt-3 text-gray-700 dark:text-gray-300">Updated: April 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Use of service</h2>
          <p className="text-gray-700 dark:text-gray-300">You may use this application to analyze resumes and manage your own application materials.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account responsibility</h2>
          <p className="text-gray-700 dark:text-gray-300">Keep your credentials secure and ensure uploaded content complies with applicable laws and employer terms.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Service availability</h2>
          <p className="text-gray-700 dark:text-gray-300">We work to keep the service available, but outages can occur due to infrastructure or third-party AI provider issues.</p>
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

export default TermsPage;
