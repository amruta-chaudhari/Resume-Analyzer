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
  const [modelsData, setModelsData] = useState([]);
  const [allowedModels, setAllowedModels] = useState([]);
  const [modelPricing, setModelPricing] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [data, modelsResponse] = await Promise.all([
          adminService.getSystemSettings(),
          adminService.getModels().catch(() => [])
        ]);

        setSettings({
          activeAiProvider: data.activeAiProvider || 'openrouter',
          openRouterKey: data.openRouterKey || '',
          openAiKey: data.openAiKey || '',
          geminiKey: data.geminiKey || '',
          anthropicKey: data.anthropicKey || '',
        });

        const activeModels = data.allowedModels ? JSON.parse(data.allowedModels) : [];
        const customPricing = data.modelPricing ? JSON.parse(data.modelPricing) : {};
        
        setAllowedModels(activeModels);
        setModelPricing(customPricing);
        setModelsData(modelsResponse || []);
      } catch (err) {
        setError('Failed to fetch system settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const [modelsLoading, setModelsLoading] = useState(false);

  const handleChange = async (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    
    if (field === 'activeAiProvider') {
      setModelsLoading(true);
      try {
        const newModels = await adminService.getModels(value);
        setModelsData(newModels || []);
      } catch (err) {
        console.warn('Failed to fetch models for provider:', value);
      } finally {
        setModelsLoading(false);
      }
    }
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
         allowedModels: JSON.stringify(allowedModels),
         modelPricing: JSON.stringify(modelPricing)
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
            <option value="openrouter">OpenRouter (Recommended, supports multiple APIs natively)</option>
            <option value="openai">OpenAI (Direct API)</option>
            <option value="gemini">Google AI Studio (Gemini Direct API)</option>
            <option value="anthropic">Anthropic (Claude Direct API)</option>
            <option value="multiple">Combine Direct APIs (OpenAI + Gemini + Anthropic)</option>
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

        {/* Model Configuration UI */}
        <div className="pt-6 border-t border-white/20">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Model Configuration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Enable or disable specific models and override their pricing. Note that enabling 0 models implies ALL are enabled by default.
            Pricing overrides are calculated per 1 Million Tokens ($).
          </p>
          
          <div className="bg-white/50 dark:bg-slate-900/60 rounded-xl overflow-hidden border border-white/20">
            {modelsData.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">No models fetched. Please check API keys above.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Enabled</th>
                      <th className="px-4 py-3 font-semibold">Model ID</th>
                      <th className="px-4 py-3 font-semibold text-right">Input/1M ($)</th>
                      <th className="px-4 py-3 font-semibold text-right">Output/1M ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {modelsData.map((model) => {
                      const isEnabled = allowedModels.length === 0 || allowedModels.includes(model.id);
                      
                      const currentPromptPrice = modelPricing[model.id]?.prompt 
                        ? (parseFloat(modelPricing[model.id].prompt) * 1000000).toFixed(4)
                        : model.pricing?.prompt ? (parseFloat(model.pricing.prompt) * 1000000).toFixed(4) : '';
                        
                      const currentCompletionPrice = modelPricing[model.id]?.completion 
                        ? (parseFloat(modelPricing[model.id].completion) * 1000000).toFixed(4)
                        : model.pricing?.completion ? (parseFloat(model.pricing.completion) * 1000000).toFixed(4) : '';

                      return (
                        <tr key={model.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              checked={isEnabled}
                              onChange={(e) => {
                                let next = [...allowedModels];
                                if (allowedModels.length === 0) {
                                  // Seed with all current models first
                                  next = modelsData.map(m => m.id);
                                }
                                if (e.target.checked && !next.includes(model.id)) {
                                  next.push(model.id);
                                } else if (!e.target.checked) {
                                  next = next.filter(id => id !== model.id);
                                }
                                setAllowedModels(next);
                              }}
                              className="w-4 h-4 rounded text-cyan-600 bg-gray-100 border-gray-300 focus:ring-cyan-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">
                            {model.name}
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{model.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              step="0.0001"
                              placeholder="Default"
                              value={currentPromptPrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                const actualPrice = val ? (parseFloat(val) / 1000000).toString() : undefined;
                                setModelPricing(prev => ({
                                  ...prev,
                                  [model.id]: {
                                    ...(prev[model.id] || {}),
                                    prompt: actualPrice
                                  }
                                }));
                              }}
                              className="w-full text-right rounded-lg border border-white/20 bg-white/70 px-2 py-1.5 text-xs text-gray-900 outline-none transition dark:bg-slate-900/60 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              step="0.0001"
                              placeholder="Default"
                              value={currentCompletionPrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                const actualPrice = val ? (parseFloat(val) / 1000000).toString() : undefined;
                                setModelPricing(prev => ({
                                  ...prev,
                                  [model.id]: {
                                    ...(prev[model.id] || {}),
                                    completion: actualPrice
                                  }
                                }));
                              }}
                              className="w-full text-right rounded-lg border border-white/20 bg-white/70 px-2 py-1.5 text-xs text-gray-900 outline-none transition dark:bg-slate-900/60 dark:text-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
