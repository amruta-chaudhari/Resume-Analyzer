import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { authService } from '../services/authService';
import { testConnection } from '../services/api';
import AnalysisDashboard from './AnalysisDashboard';
import AnalysisPage from './AnalysisPage';
import ResumeManagementPage from './ResumeManagementPage';
import HistoryPage from './HistoryPage';
import JobDescriptionsPage from './JobDescriptionsPage';
import SettingsPanel from '../components/SettingsPanel';
import useTheme from '../hooks/useTheme';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState('');
  const { clearAuth, updateUser, refreshToken, hasHydrated, user } = useAuthStore();
  const navigate = useNavigate();
  const hasAdminAccess =
    user?.role === 'ADMIN' ||
    user?.subscriptionTier === 'admin';

  // Model Parameters state
  const [modelParameters, setModelParameters] = useState({
    temperature: 0.15,
    max_tokens: 4000,
    max_completion_tokens: 4000,
    include_reasoning: false
  });

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Model selector state
  const [showModelSelector, setShowModelSelector] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const saved = localStorage.getItem('showModelSelector');
    if (saved === null) {
      return false;
    }
    try {
      return JSON.parse(saved);
    } catch (err) {
      console.warn('Failed to parse stored showModelSelector value:', err);
      return false;
    }
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const saved = localStorage.getItem('selectedModel');
    return saved || null;
  });

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const loadUser = async () => {
      try {
        const userResponse = await authService.getCurrentUser();
        if (userResponse?.user) {
          updateUser(userResponse.user);
        }
        setSessionWarning('');
        // User is authenticated, continue to dashboard
      } catch (error) {
        const message = String(error?.message || '');
        const isAuthError =
          message.includes('Authentication required') ||
          message.includes('Invalid refresh token') ||
          message.includes('Missing refresh token') ||
          message.includes('Invalid token') ||
          message.includes('No token provided') ||
          message.includes('User not found');

        if (isAuthError) {
          clearAuth();
          navigate('/login', { replace: true });
          return;
        }

        setSessionWarning('Session validation is temporarily unavailable. Your session is preserved; try again shortly.');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [clearAuth, hasHydrated, navigate, updateUser]);

  // Check backend connection
  const checkConnection = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      const result = await testConnection();
      setConnectionStatus(result.success ? 'connected' : 'error');
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('error');
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleLogout = () => {
    authService.logout(refreshToken).catch(() => {});
    clearAuth();
    navigate('/login', { replace: true });
  };

  const handleToggleModelSelector = () => {
    setShowModelSelector(prev => !prev);
  };

  const handleResetSettings = () => {
    setShowModelSelector(false);
    setSelectedModel(null);
    localStorage.removeItem('showModelSelector');
    localStorage.removeItem('selectedModel');
  };

  const handleModelParametersChange = (newParameters) => {
    setModelParameters(newParameters);
  };

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('showModelSelector', JSON.stringify(showModelSelector));
  }, [showModelSelector]);

  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem('selectedModel', selectedModel);
    }
  }, [selectedModel]);

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'checking':
        return {
          color: 'bg-yellow-400',
          text: 'Checking backend',
          icon: '⏳'
        };
      case 'connected':
        return {
          color: 'bg-green-400',
          text: 'Backend online',
          icon: '✅'
        };
      case 'error':
        return {
          color: 'bg-red-400',
          text: 'Backend offline',
          icon: '❌'
        };
      default:
        return {
          color: 'bg-gray-400',
          text: 'Unknown',
          icon: '❓'
        };
    }
  };

  const connectionInfo = getConnectionStatusDisplay();

  const navigationItems = [
    {
      key: 'analysis',
      to: '/dashboard/analysis',
      path: '/analysis',
      desktopLabel: 'ATS Analysis',
      mobileLabel: 'Analyze',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      key: 'resumes',
      to: '/dashboard/resumes',
      path: '/resumes',
      desktopLabel: 'Resume Library',
      mobileLabel: 'Resumes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: 'jobs',
      to: '/dashboard/job-descriptions',
      path: '/job-descriptions',
      desktopLabel: 'Job Descriptions',
      mobileLabel: 'Jobs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: 'history',
      to: '/dashboard/history',
      path: '/history',
      desktopLabel: 'History & Usage',
      mobileLabel: 'History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen animated-bg paper-texture flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-bg paper-texture relative overflow-hidden">
      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-xl animate-pulse delay-2000"></div>
      </div>

      <SettingsPanel
        showModelSelector={showModelSelector}
        onToggleModelSelector={handleToggleModelSelector}
        onReset={handleResetSettings}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="container mx-auto px-4 py-6 sm:py-8 pb-28 sm:pb-8 relative z-10 fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="glass-strong rounded-3xl p-4 sm:p-8 mx-auto max-w-4xl hover-glass">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-4 sm:space-y-0">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 sm:p-3 rounded-2xl mr-3 sm:mr-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  ATS Resume Analyzer
                </h1>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm sm:text-base whitespace-nowrap"
              >
                Logout
              </button>
            </div>
            {hasAdminAccess && (
              <div className="mt-4 flex justify-center">
                <Link
                  to="/admin/users"
                  className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Admin Console
                </Link>
              </div>
            )}
            <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 font-light">
              Get AI-powered insights on how well your resume matches the job description
            </p>
            {sessionWarning && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 text-sm" role="status" aria-live="polite">
                {sessionWarning}
              </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4 flex-wrap">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 glass px-3 sm:px-4 py-2 rounded-full">
                <div className={`w-2 h-2 ${connectionInfo.color} rounded-full ${connectionStatus === 'checking' ? 'animate-pulse' : ''}`}></div>
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{connectionInfo.text}</span>
              </div>

              <div className="flex items-center space-x-2 glass px-3 sm:px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">AI-Powered Analysis</span>
              </div>
              <div className="flex items-center space-x-2 glass px-3 sm:px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-500"></div>
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Instant Results</span>
              </div>
              {showModelSelector && (
                <div className="flex items-center space-x-2 glass px-3 sm:px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Dynamic AI Models</span>
                </div>
              )}
            </div>

            {/* Connection retry button */}
            {connectionStatus === 'error' && (
              <div className="mt-4">
                <button
                  onClick={checkConnection}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:block mb-8">
          <div className="glass-strong rounded-2xl p-2 mx-auto max-w-5xl">
            <nav className="flex items-center gap-2 overflow-x-auto px-1" aria-label="Primary navigation">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) => `inline-flex items-center justify-center gap-2 px-4 lg:px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span>{item.desktopLabel}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main id="dashboard-content" role="main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/analysis" replace />} />
            <Route
              path="analysis"
              element={
                <AnalysisDashboard
                  showModelSelector={showModelSelector}
                  selectedModel={selectedModel}
                  modelParameters={modelParameters}
                  connectionStatus={connectionStatus}
                  setConnectionStatus={setConnectionStatus}
                  onModelSelect={setSelectedModel}
                  onModelParametersChange={handleModelParametersChange}
                />
              }
            />
            <Route path="analysis/:id" element={<AnalysisPage embedded />} />
            <Route path="resumes" element={<ResumeManagementPage />} />
            <Route path="job-descriptions" element={<JobDescriptionsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/dashboard/analysis" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="glass rounded-2xl p-6 mx-auto max-w-2xl">
            <p className="text-gray-700 dark:text-gray-300 font-light">
              Powered by advanced AI algorithms to help you land your dream job
            </p>
            {showModelSelector && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Dynamic model selection with real-time updates
              </p>
            )}
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <Link to="/privacy" className="text-gray-700 dark:text-gray-300 hover:underline">Privacy</Link>
              <Link to="/terms" className="text-gray-700 dark:text-gray-300 hover:underline">Terms</Link>
              <Link to="/404" className="text-gray-700 dark:text-gray-300 hover:underline">Help</Link>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
          <nav
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
            aria-label="Primary navigation"
          >
            <div className="flex justify-around items-center max-w-md mx-auto gap-1">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) => `flex flex-col items-center justify-center px-2 py-2 min-h-11 rounded-xl transition-all duration-300 min-w-0 flex-1 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  aria-label={item.desktopLabel}
                >
                  <span className="mb-1">{item.icon}</span>
                  <span className="text-xs font-medium truncate">{item.mobileLabel}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
