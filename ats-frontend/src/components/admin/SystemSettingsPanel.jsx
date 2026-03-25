import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';

const SystemSettingsPanel = () => {
  const [settings, setSettings] = useState({
    activeAiProvider: 'openrouter',
    openRouterKey: '',
    openAiKey: '',
    geminiKey: '',
    anthropicKey: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await adminService.getSystemSettings();
        setSettings({
          activeAiProvider: data.activeAiProvider || 'openrouter',
          openRouterKey: data.openRouterKey || '',
          openAiKey: data.openAiKey || '',
          geminiKey: data.geminiKey || '',
          anthropicKey: data.anthropicKey || '',
        });
      } catch (err) {
        setError('Failed to fetch system settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await adminService.updateSystemSettings({
         activeAiProvider: settings.activeAiProvider,
         openRouterKey: settings.openRouterKey || null,
         openAiKey: settings.openAiKey || null,
         geminiKey: settings.geminiKey || null,
         anthropicKey: settings.anthropicKey || null,
      });
      setSuccess('System settings updated successfully.');
    } catch (err) {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-strong rounded-3xl p-10 text-center text-sm text-gray-500">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl p-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        AI Provider Configuration
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Configure the active AI model provider and their respective API keys dynamically without needing to rebuild the Docker container.
        Leaving a key blank will make the system fallback to the .env file variable.
      </p>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 mb-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 mb-6 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Active AI Provider
          <select
            value={settings.activeAiProvider}
            onChange={(e) => handleChange('activeAiProvider', e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-gray-900 outline-none transition focus:border-cyan-400 dark:bg-slate-900/60 dark:text-white"
          >
            <option value="openrouter">OpenRouter (Recommended, supports multiple models)</option>
            <option value="openai">OpenAI (ChatGPT, GPT-4)</option>
            <option value="gemini">Google AI Studio (Gemini 1.5)</option>
            <option value="anthropic">Anthropic (Claude 3)</option>
          </select>
        </label>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            OpenRouter API Key
            <input
              type="password"
              value={settings.openRouterKey}
              onChange={(e) => handleChange('openRouterKey', e.target.value)}
              placeholder="sk-or-v1-..."
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-gray-900 outline-none transition focus:border-cyan-400 dark:bg-slate-900/60 dark:text-white"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            OpenAI API Key
            <input
              type="password"
              value={settings.openAiKey}
              onChange={(e) => handleChange('openAiKey', e.target.value)}
              placeholder="sk-proj-..."
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-gray-900 outline-none transition focus:border-cyan-400 dark:bg-slate-900/60 dark:text-white"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Google AI Studio (Gemini) API Key
            <input
              type="password"
              value={settings.geminiKey}
              onChange={(e) => handleChange('geminiKey', e.target.value)}
              placeholder="AIzaSy..."
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-gray-900 outline-none transition focus:border-cyan-400 dark:bg-slate-900/60 dark:text-white"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Anthropic API Key
            <input
              type="password"
              value={settings.anthropicKey}
              onChange={(e) => handleChange('anthropicKey', e.target.value)}
              placeholder="sk-ant-..."
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-gray-900 outline-none transition focus:border-cyan-400 dark:bg-slate-900/60 dark:text-white"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
};

export default SystemSettingsPanel;
