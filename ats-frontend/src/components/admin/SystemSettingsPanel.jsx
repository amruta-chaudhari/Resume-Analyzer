import React, { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/adminService';
import { adminCardClass, adminFieldClass } from '../../pages/admin/shared';

const DEFAULT_PLAN_ORDER = ['free', 'pro', 'enterprise', 'admin'];

const providerOptions = [
  { id: 'openrouter', label: 'OpenRouter', description: 'OpenRouter catalog and routing' },
  { id: 'openai', label: 'OpenAI', description: 'Direct OpenAI models' },
  { id: 'gemini', label: 'Google Gemini', description: 'Google AI Studio API models' },
  { id: 'anthropic', label: 'Anthropic Claude', description: 'Anthropic model family' },
];

const safeParse = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseCommaList = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? Array.from(new Set(values)) : null;
};

const getSortedPlanKeys = (planLimits) => {
  const allKeys = Object.keys(planLimits || {});
  const defaultKeys = DEFAULT_PLAN_ORDER.filter((key) => allKeys.includes(key));
  const customKeys = allKeys.filter((key) => !DEFAULT_PLAN_ORDER.includes(key)).sort();
  return [...defaultKeys, ...customKeys];
};

const normalizeProviderList = (value) => {
  if (!value || typeof value !== 'string') {
    return providerOptions.map((provider) => provider.id);
  }

  if (value === 'multiple') {
    return providerOptions.map((provider) => provider.id);
  }

  const selected = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (selected.length === 0) {
    return providerOptions.map((provider) => provider.id);
  }

  return Array.from(new Set(selected));
};

const serializeProviders = (providers) => {
  const unique = Array.from(new Set(providers));

  if (unique.length <= 1) {
    return unique[0] || 'openrouter';
  }

  return unique.join(',');
};

const parseModelPricingForDisplay = (modelPricing, modelId, pricingField) => {
  const overrideValue = modelPricing?.[modelId]?.[pricingField];
  if (overrideValue != null && overrideValue !== '') {
    const numeric = Number(overrideValue);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return (numeric * 1000000).toFixed(4);
    }
  }

  return '';
};

const SystemSettingsPanel = () => {
  const [settings, setSettings] = useState({
    selectedProviders: ['openrouter'],
    openRouterKey: '',
    openAiKey: '',
    geminiKey: '',
    anthropicKey: '',
  });
  const [keyStatus, setKeyStatus] = useState({
    hasOpenRouterKey: false,
    hasOpenAiKey: false,
    hasGeminiKey: false,
    hasAnthropicKey: false,
    openRouterKeyMasked: null,
    openAiKeyMasked: null,
    geminiKeyMasked: null,
    anthropicKeyMasked: null,
  });

  const [modelsData, setModelsData] = useState([]);
  const [allowedModels, setAllowedModels] = useState([]);
  const [modelPricing, setModelPricing] = useState({});
  const [planLimits, setPlanLimits] = useState({});
  const [newPlanKey, setNewPlanKey] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedProvidersDisplay = useMemo(
    () => providerOptions.filter((provider) => settings.selectedProviders.includes(provider.id)),
    [settings.selectedProviders]
  );
  const planKeys = useMemo(() => getSortedPlanKeys(planLimits), [planLimits]);

  const fetchModels = async (providerSelection) => {
    setModelsLoading(true);
    try {
      const providerOverride = providerSelection.length > 1 ? providerSelection.join(',') : providerSelection[0];
      const models = await adminService.getModels(providerOverride);
      setModelsData(models || []);
    } catch (_error) {
      setModelsData([]);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await adminService.getSystemSettings();
        const selectedProviders = normalizeProviderList(data.activeAiProvider);
        const parsedAllowedModels = safeParse(data.allowedModels, []);
        const parsedModelPricing = safeParse(data.modelPricing, {});
        const parsedPlanLimits = data.planLimitsResolved || safeParse(data.planLimits, {});

        setSettings((prev) => ({
          ...prev,
          selectedProviders,
        }));
        setKeyStatus({
          hasOpenRouterKey: Boolean(data.hasOpenRouterKey),
          hasOpenAiKey: Boolean(data.hasOpenAiKey),
          hasGeminiKey: Boolean(data.hasGeminiKey),
          hasAnthropicKey: Boolean(data.hasAnthropicKey),
          openRouterKeyMasked: data.openRouterKeyMasked || null,
          openAiKeyMasked: data.openAiKeyMasked || null,
          geminiKeyMasked: data.geminiKeyMasked || null,
          anthropicKeyMasked: data.anthropicKeyMasked || null,
        });

        setAllowedModels(Array.isArray(parsedAllowedModels) ? parsedAllowedModels : []);
        setModelPricing(parsedModelPricing && typeof parsedModelPricing === 'object' ? parsedModelPricing : {});
        setPlanLimits(parsedPlanLimits && typeof parsedPlanLimits === 'object' ? parsedPlanLimits : {});

        await fetchModels(selectedProviders);
      } catch (_error) {
        setError('Failed to fetch system settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleProviderToggle = async (providerId) => {
    const isSelected = settings.selectedProviders.includes(providerId);
    let nextProviders = settings.selectedProviders;

    if (isSelected) {
      nextProviders = settings.selectedProviders.filter((provider) => provider !== providerId);
    } else {
      nextProviders = [...settings.selectedProviders, providerId];
    }

    if (nextProviders.length === 0) {
      nextProviders = ['openrouter'];
    }

    setSettings((previous) => ({
      ...previous,
      selectedProviders: nextProviders,
    }));

    setSuccess('');
    setError('');
    await fetchModels(nextProviders);
  };

  const handlePricingChange = (modelId, pricingField, displayValue) => {
    const normalizedValue = displayValue.trim();

    setModelPricing((previous) => {
      const next = { ...previous };
      const current = { ...(next[modelId] || {}) };

      if (normalizedValue === '') {
        delete current[pricingField];
      } else {
        const parsed = Number(normalizedValue);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return previous;
        }
        current[pricingField] = String(parsed / 1000000);
      }

      if (!current.prompt && !current.completion) {
        delete next[modelId];
      } else {
        next[modelId] = current;
      }

      return next;
    });
  };

  const handleModelToggle = (modelId, checked) => {
    if (allowedModels.length === 0) {
      const seeded = modelsData.map((model) => model.id);
      if (!checked) {
        setAllowedModels(seeded.filter((id) => id !== modelId));
      } else {
        setAllowedModels(seeded);
      }
      return;
    }

    if (checked) {
      setAllowedModels((previous) => Array.from(new Set([...previous, modelId])));
      return;
    }

    setAllowedModels((previous) => previous.filter((id) => id !== modelId));
  };

  const setPlanField = (tier, field, value) => {
    setPlanLimits((previous) => ({
      ...previous,
      [tier]: {
        ...(previous[tier] || {}),
        [field]: value,
      },
    }));
  };

  const handleAddPlan = () => {
    const normalizedKey = newPlanKey.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalizedKey || planLimits[normalizedKey]) {
      return;
    }

    setPlanLimits((previous) => ({
      ...previous,
      [normalizedKey]: {
        monthlyBudgetUsd: null,
        monthlyTokenLimit: null,
        monthlyRequestLimit: null,
        allowReasoning: false,
        allowedModels: null,
        allowedProviders: null,
      },
    }));
    setNewPlanKey('');
  };

  const handleRemovePlan = (planKey) => {
    if (DEFAULT_PLAN_ORDER.includes(planKey)) {
      return;
    }

    setPlanLimits((previous) => {
      const next = { ...previous };
      delete next[planKey];
      return next;
    });
  };

  const normalizePlanLimitsPayload = () => {
    const normalized = {};

    for (const tier of planKeys) {
      const currentTier = planLimits[tier] || {};
      const budgetRaw = currentTier.monthlyBudgetUsd;
      const tokenRaw = currentTier.monthlyTokenLimit;
      const requestRaw = currentTier.monthlyRequestLimit;

      const budgetValue = budgetRaw == null || budgetRaw === '' ? null : Number(budgetRaw);
      const tokenValue = tokenRaw == null || tokenRaw === '' ? null : Number(tokenRaw);
      const requestValue = requestRaw == null || requestRaw === '' ? null : Number(requestRaw);

      normalized[tier] = {
        monthlyBudgetUsd: Number.isFinite(budgetValue) && budgetValue >= 0 ? budgetValue : null,
        monthlyTokenLimit: Number.isFinite(tokenValue) && tokenValue >= 0 ? Math.floor(tokenValue) : null,
        monthlyRequestLimit: Number.isFinite(requestValue) && requestValue >= 0 ? Math.floor(requestValue) : null,
        allowReasoning: Boolean(currentTier.allowReasoning),
        allowedModels: Array.isArray(currentTier.allowedModels)
          ? currentTier.allowedModels.filter((item) => typeof item === 'string' && item.trim().length > 0)
          : parseCommaList(currentTier.allowedModels),
        allowedProviders: Array.isArray(currentTier.allowedProviders)
          ? currentTier.allowedProviders.filter((item) => typeof item === 'string' && item.trim().length > 0)
          : parseCommaList(currentTier.allowedProviders),
      };
    }

    return normalized;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        activeAiProvider: serializeProviders(settings.selectedProviders),
        openRouterKey: settings.openRouterKey.trim() ? settings.openRouterKey.trim() : null,
        openAiKey: settings.openAiKey.trim() ? settings.openAiKey.trim() : null,
        geminiKey: settings.geminiKey.trim() ? settings.geminiKey.trim() : null,
        anthropicKey: settings.anthropicKey.trim() ? settings.anthropicKey.trim() : null,
        allowedModels: JSON.stringify(allowedModels),
        modelPricing: JSON.stringify(modelPricing),
        planLimits: JSON.stringify(normalizePlanLimitsPayload()),
      };

      const updated = await adminService.updateSystemSettings(payload);

      setKeyStatus({
        hasOpenRouterKey: Boolean(updated.hasOpenRouterKey),
        hasOpenAiKey: Boolean(updated.hasOpenAiKey),
        hasGeminiKey: Boolean(updated.hasGeminiKey),
        hasAnthropicKey: Boolean(updated.hasAnthropicKey),
        openRouterKeyMasked: updated.openRouterKeyMasked || null,
        openAiKeyMasked: updated.openAiKeyMasked || null,
        geminiKeyMasked: updated.geminiKeyMasked || null,
        anthropicKeyMasked: updated.anthropicKeyMasked || null,
      });

      const normalizedProviders = normalizeProviderList(updated.activeAiProvider);
      setSettings((previous) => ({
        ...previous,
        selectedProviders: normalizedProviders,
        openRouterKey: '',
        openAiKey: '',
        geminiKey: '',
        anthropicKey: '',
      }));

      setSuccess('System settings updated successfully.');
      await fetchModels(normalizedProviders);
    } catch (_error) {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`${adminCardClass} text-center text-sm text-slate-500 dark:text-slate-400`}>
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={adminCardClass}>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">AI Provider Configuration</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Manage provider routing, API credential overrides, model allowlists, pricing controls, and per-plan limits from one control plane.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Active Providers</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select one or multiple providers to aggregate model catalogs.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {providerOptions.map((option) => {
                const checked = settings.selectedProviders.includes(option.id);

                return (
                  <label
                    key={option.id}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      checked
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                        : 'border-slate-200 bg-white hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-cyan-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleProviderToggle(option.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{option.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedProvidersDisplay.map((provider) => (
                <span
                  key={provider.id}
                  className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200"
                >
                  {provider.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Credential Overrides</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Leave blank to keep existing DB value or .env fallback.</p>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                OpenRouter API Key
                <input
                  type="password"
                  value={settings.openRouterKey}
                  onChange={(event) => setSettings((prev) => ({ ...prev, openRouterKey: event.target.value }))}
                  placeholder="sk-or-v1-..."
                  className={adminFieldClass}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {keyStatus.hasOpenRouterKey ? `Stored: ${keyStatus.openRouterKeyMasked || 'configured'}` : 'No key configured'}
                </p>
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                OpenAI API Key
                <input
                  type="password"
                  value={settings.openAiKey}
                  onChange={(event) => setSettings((prev) => ({ ...prev, openAiKey: event.target.value }))}
                  placeholder="sk-proj-..."
                  className={adminFieldClass}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {keyStatus.hasOpenAiKey ? `Stored: ${keyStatus.openAiKeyMasked || 'configured'}` : 'No key configured'}
                </p>
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Google Gemini API Key
                <input
                  type="password"
                  value={settings.geminiKey}
                  onChange={(event) => setSettings((prev) => ({ ...prev, geminiKey: event.target.value }))}
                  placeholder="AIzaSy..."
                  className={adminFieldClass}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {keyStatus.hasGeminiKey ? `Stored: ${keyStatus.geminiKeyMasked || 'configured'}` : 'No key configured'}
                </p>
              </label>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Anthropic API Key
                <input
                  type="password"
                  value={settings.anthropicKey}
                  onChange={(event) => setSettings((prev) => ({ ...prev, anthropicKey: event.target.value }))}
                  placeholder="sk-ant-..."
                  className={adminFieldClass}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {keyStatus.hasAnthropicKey ? `Stored: ${keyStatus.anthropicKeyMasked || 'configured'}` : 'No key configured'}
                </p>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Model Governance</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Control model availability and optional prompt/completion pricing overrides per 1M tokens.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAllowedModels([])}
                  className="rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200"
                >
                  Allow All (empty list)
                </button>
                <button
                  type="button"
                  onClick={() => setAllowedModels(['__none__'])}
                  className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
                >
                  Deny All
                </button>
                <button
                  type="button"
                  onClick={() => setModelPricing({})}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Reset Pricing
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              {modelsLoading ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Refreshing provider models...</div>
              ) : modelsData.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">No models fetched. Check provider credentials or selection.</div>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Enabled</th>
                        <th className="px-4 py-3 font-semibold">Model</th>
                        <th className="px-4 py-3 text-right font-semibold">Prompt / 1M ($)</th>
                        <th className="px-4 py-3 text-right font-semibold">Completion / 1M ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {modelsData.map((model) => {
                        const isEnabled = allowedModels.length === 0 || allowedModels.includes(model.id);

                        return (
                          <tr key={model.id} className="bg-white/80 hover:bg-cyan-50/60 dark:bg-slate-900/60 dark:hover:bg-slate-800/70">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(event) => handleModelToggle(model.id, event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900 dark:text-slate-100">{model.name}</p>
                              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{model.id}</p>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                placeholder="Default"
                                value={parseModelPricingForDisplay(modelPricing, model.id, 'prompt')}
                                onChange={(event) => handlePricingChange(model.id, 'prompt', event.target.value)}
                                className="w-full rounded-lg border border-slate-300/70 bg-white px-2 py-1.5 text-right text-xs text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                placeholder="Default"
                                value={parseModelPricingForDisplay(modelPricing, model.id, 'completion')}
                                onChange={(event) => handlePricingChange(model.id, 'completion', event.target.value)}
                                className="w-full rounded-lg border border-slate-300/70 bg-white px-2 py-1.5 text-right text-xs text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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

          <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Plan Catalog And LLM Limits</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Define plan-specific budgets, request caps, model access, and provider access.</p>
              </div>
              <div className="flex w-full gap-3 lg:w-auto">
                <input
                  type="text"
                  value={newPlanKey}
                  onChange={(event) => setNewPlanKey(event.target.value)}
                  placeholder="new-plan-key"
                  className="w-full rounded-2xl border border-slate-300/70 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white lg:w-64"
                />
                <button
                  type="button"
                  onClick={handleAddPlan}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Add Plan
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {planKeys.map((tier) => {
                const limit = planLimits[tier] || {};
                const canRemove = !DEFAULT_PLAN_ORDER.includes(tier);

                return (
                  <div key={tier} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">{tier}</h4>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlan(tier)}
                          className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Monthly Budget (USD)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={limit.monthlyBudgetUsd ?? ''}
                          onChange={(event) => setPlanField(tier, 'monthlyBudgetUsd', event.target.value)}
                          className={adminFieldClass}
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Monthly Token Limit
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={limit.monthlyTokenLimit ?? ''}
                          onChange={(event) => setPlanField(tier, 'monthlyTokenLimit', event.target.value)}
                          className={adminFieldClass}
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
                        Monthly Request Limit
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={limit.monthlyRequestLimit ?? ''}
                          onChange={(event) => setPlanField(tier, 'monthlyRequestLimit', event.target.value)}
                          className={adminFieldClass}
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
                        Allowed Models
                        <input
                          type="text"
                          value={Array.isArray(limit.allowedModels) ? limit.allowedModels.join(', ') : (limit.allowedModels || '')}
                          onChange={(event) => setPlanField(tier, 'allowedModels', event.target.value)}
                          placeholder="Empty = all models allowed"
                          className={adminFieldClass}
                        />
                      </label>

                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
                        Allowed Providers
                        <input
                          type="text"
                          value={Array.isArray(limit.allowedProviders) ? limit.allowedProviders.join(', ') : (limit.allowedProviders || '')}
                          onChange={(event) => setPlanField(tier, 'allowedProviders', event.target.value)}
                          placeholder="openrouter, openai, gemini, anthropic"
                          className={adminFieldClass}
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={Boolean(limit.allowReasoning)}
                        onChange={(event) => setPlanField(tier, 'allowReasoning', event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      Allow reasoning by default
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setSuccess('');
                setError('');
              }}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear Messages
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default SystemSettingsPanel;
