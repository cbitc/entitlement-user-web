import { useSyncExternalStore } from 'react';
import { authStore, type AuthState } from '@/stores/auth';

export const useAuth = (): AuthState & {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
} => {
  const state = useSyncExternalStore(
    authStore.subscribe.bind(authStore),
    authStore.getState.bind(authStore),
  );
  return {
    ...state,
    isAuthenticated: authStore.isAuthenticated(),
    login: authStore.login.bind(authStore),
    logout: authStore.logout.bind(authStore),
  };
};
