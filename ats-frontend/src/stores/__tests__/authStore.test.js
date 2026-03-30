import useAuthStore from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
    });
  });

  it('sets authenticated state when refresh token exists', () => {
    useAuthStore.getState().setAuth({ id: 'u1' }, null, 'refresh-token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual({ id: 'u1' });
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('clears auth state', () => {
    useAuthStore.getState().setAuth({ id: 'u1' }, 'access', 'refresh');
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('merges user updates', () => {
    useAuthStore.getState().setAuth({ id: 'u1', firstName: 'A' }, 'access', 'refresh');
    useAuthStore.getState().updateUser({ firstName: 'B', lastName: 'User' });

    expect(useAuthStore.getState().user).toEqual({ id: 'u1', firstName: 'B', lastName: 'User' });
  });

  it('tracks hydration flag', () => {
    useAuthStore.getState().setHasHydrated(true);
    expect(useAuthStore.getState().hasHydrated).toBe(true);
  });
});
