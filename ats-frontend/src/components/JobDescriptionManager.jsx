import React, { useState, useEffect } from 'react';
import {
  getJobDescriptions,
  createJobDescription,
  updateJobDescription,
  deleteJobDescription,
  bulkDeleteJobDescriptions,
} from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const JobDescriptionManager = () => {
  const [jobDescriptions, setJobDescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadJobDescriptions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getJobDescriptions();
      setJobDescriptions(data || []);
      setSelectedJobIds((previous) => previous.filter((jobId) => (data || []).some((job) => job.id === jobId)));
    } catch (err) {
      setError(err.message || 'Failed to load job descriptions');
      console.error('Error loading job descriptions:', err);
      setJobDescriptions([]);
      setSelectedJobIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobDescriptions();
  }, []);

  const handleCreate = () => {
    setEditingJob(null);
    setFormData({ title: '', description: '' });
    setShowForm(true);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingJob(null);
    setFormData({ title: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedTitle = formData.title.trim();
    const normalizedDescription = formData.description.trim();

    if (!normalizedTitle || !normalizedDescription) {
      setError('Please fill in all fields');
      return;
    }

    if (normalizedTitle.length < 2 || normalizedTitle.length > 200) {
      setError('Job title must be between 2 and 200 characters');
      return;
    }

    if (normalizedDescription.length < 30 || normalizedDescription.length > 20000) {
      setError('Job description must be between 30 and 20000 characters');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        ...formData,
        title: normalizedTitle,
        description: normalizedDescription,
      };

      if (editingJob) {
        await updateJobDescription(editingJob.id, payload);
      } else {
        await createJobDescription(payload);
      }

      await loadJobDescriptions();
      handleCancel();
    } catch (err) {
      setError(err.message || 'Failed to save job description');
      console.error('Error saving job description:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job description?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteJobDescription(jobId);
      await loadJobDescriptions();
    } catch (err) {
      setError(err.message || 'Failed to delete job description');
      console.error('Error deleting job description:', err);
      setLoading(false);
    }
  };

  const toggleJobSelection = (jobId) => {
    setSelectedJobIds((previous) => (
      previous.includes(jobId)
        ? previous.filter((id) => id !== jobId)
        : [...previous, jobId]
    ));
  };

  const selectAllVisible = () => {
    setSelectedJobIds(jobDescriptions.map((job) => job.id));
  };

  const clearSelection = () => {
    setSelectedJobIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedJobIds.length === 0) {
      return;
    }

    if (!window.confirm(`Delete ${selectedJobIds.length} selected job description(s)?`)) {
      return;
    }

    try {
      setBulkDeleting(true);
      setError('');
      await bulkDeleteJobDescriptions(selectedJobIds);
      await loadJobDescriptions();
      setSelectedJobIds([]);
    } catch (err) {
      setError(err.message || 'Failed to delete selected job descriptions');
      console.error('Error bulk deleting job descriptions:', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && (!Array.isArray(jobDescriptions) || jobDescriptions.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner label="Loading job descriptions..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Job Description Library
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Save and manage reusable job descriptions for quick access during analysis
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving || loading || bulkDeleting}
            className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Job Description</span>
          </button>
        </div>

        {Array.isArray(jobDescriptions) && jobDescriptions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-900/40">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {selectedJobIds.length} selected
            </span>
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={bulkDeleting || loading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkDeleting || loading || selectedJobIds.length === 0}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-purple-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting || loading || selectedJobIds.length === 0}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleting ? 'Deleting...' : 'Delete selected'}
            </button>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} />}

      {showForm && (
        <div className="glass-strong rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            {editingJob ? 'Edit Job Description' : 'Create New Job Description'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title *
              </label>
              <input
                type="text"
                id="job-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Senior Software Engineer"
                required
              />
            </div>

            <div>
              <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Description *
              </label>
              <textarea
                id="job-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Paste the full job description here..."
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : (editingJob ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {(!Array.isArray(jobDescriptions) || jobDescriptions.length === 0) && !loading ? (
        <div className="glass rounded-2xl p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
            No Job Descriptions Saved
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Save job descriptions to quickly access them during resume analysis.
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Add Your First Job Description
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(jobDescriptions) && jobDescriptions.map((job) => (
            <div key={job.id} className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1 pr-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedJobIds.includes(job.id)}
                    onChange={() => toggleJobSelection(job.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    aria-label={`Select ${job.title}`}
                  />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
                    {job.title}
                  </h3>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(job)}
                    disabled={bulkDeleting || loading}
                    className="rounded-lg p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    title="Edit"
                    aria-label="Edit job description"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(job.id)}
                    disabled={bulkDeleting || loading}
                    className="rounded-lg p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    title="Delete"
                    aria-label="Delete job description"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">
                {job.description}
              </p>

              <div className="text-xs text-gray-500 dark:text-gray-500">
                Created: {formatDate(job.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobDescriptionManager;
