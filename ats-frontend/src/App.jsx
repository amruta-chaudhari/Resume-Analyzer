import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AdminPage from './pages/AdminPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminSystemPage from './pages/admin/AdminSystemPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminUsageEventsPage from './pages/admin/AdminUsageEventsPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppErrorBoundary from './components/AppErrorBoundary';

const LegacyAnalysisRedirect = () => {
  const { id } = useParams();
  return <Navigate to={id ? `/dashboard/analysis/${id}` : '/dashboard/analysis'} replace />;
};

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/analysis" element={<Navigate to="/dashboard/analysis" replace />} />
            <Route path="/analysis/:id" element={<LegacyAnalysisRedirect />} />
            <Route path="/resumes" element={<Navigate to="/dashboard/resumes" replace />} />
            <Route path="/history" element={<Navigate to="/dashboard/history" replace />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:userId" element={<AdminUserDetailPage />} />
              <Route path="system" element={<AdminSystemPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="analytics/events" element={<AdminUsageEventsPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
