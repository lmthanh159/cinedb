'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { LS_KEYS } from '@/lib/constants';
import type { AuthUser, LoginData, RegisterData } from '@/types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authInitialized: boolean;

  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<string>;
  fetchUser: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  setAuthInitialized: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      authInitialized: false,

      setAuthInitialized: () => set({ authInitialized: true }),

      setTokens: (access, refresh) => {
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
      },

      login: async (data) => {
        set({ isLoading: true });
        try {
          // Lazy import to avoid circular dependency (api.ts imports this store)
          const { authApi } = await import('@/lib/api');
          const res = await authApi.login(data);
          const { accessToken, refreshToken, user } = res.data.data;
          set({ user, accessToken, refreshToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const { authApi } = await import('@/lib/api');
          await authApi.register(data);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        // Fire-and-forget backend logout; clear client state regardless
        import('@/lib/api')
          .then(({ authApi }) => {
            const { refreshToken } = get();
            authApi.logout(refreshToken ?? undefined).catch(() => undefined);
          })
          .catch(() => undefined);

        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');

        const { authApi } = await import('@/lib/api');
        const res = await authApi.refresh(refreshToken);
        const { accessToken } = res.data.data;
        set({ accessToken, isAuthenticated: true });
        return accessToken;
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const { authApi } = await import('@/lib/api');
          const res = await authApi.getMe();
          set({ user: res.data.data, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: LS_KEYS.REFRESH_TOKEN,
      // Only persist refreshToken; accessToken stays in memory
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    },
  ),
);
