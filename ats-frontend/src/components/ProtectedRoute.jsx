import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasSessionToken = useAuthStore((state) => Boolean(state.accessToken || state.refreshToken));
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading session..." />
      </div>
    );
  }

  if (!isAuthenticated || !hasSessionToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
