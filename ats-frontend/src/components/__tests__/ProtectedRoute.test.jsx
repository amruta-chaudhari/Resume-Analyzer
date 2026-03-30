import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';
import useAuthStore from '../../stores/authStore';

const renderWithRouter = (ui, initialPath = '/dashboard') => (
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>{ui}</Routes>
    </MemoryRouter>
  )
);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: true,
    });
  });

  it('shows loading spinner before hydration', () => {
    useAuthStore.setState({ hasHydrated: false });

    renderWithRouter(
      <Route path="/dashboard" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
    );

    expect(screen.getByRole('status', { name: /loading session/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', () => {
    renderWithRouter(
      <>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
      </>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    useAuthStore.setState({
      user: { id: 'u1', role: 'USER', subscriptionTier: 'free' },
      refreshToken: 'refresh-token',
      isAuthenticated: true,
      hasHydrated: true,
    });

    renderWithRouter(
      <Route path="/dashboard" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('redirects non-admin when admin access is required', () => {
    useAuthStore.setState({
      user: { id: 'u1', role: 'USER', subscriptionTier: 'free' },
      refreshToken: 'refresh-token',
      isAuthenticated: true,
      hasHydrated: true,
    });

    renderWithRouter(
      <>
        <Route path="/dashboard/analysis" element={<div>Analysis Page</div>} />
        <Route
          path="/dashboard/admin"
          element={<ProtectedRoute requireAdmin><div>Admin Page</div></ProtectedRoute>}
        />
      </>,
      '/dashboard/admin'
    );

    expect(screen.getByText('Analysis Page')).toBeInTheDocument();
  });
});
