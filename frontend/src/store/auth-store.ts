import { create } from 'zustand';

import type { User } from '@/types';

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cinedb-token', token);
    }

    set({
      user,
      token,
      isAuthenticated: true,
    });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('cinedb-token');
    }

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));

