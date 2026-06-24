import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@academy/shared';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,

      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),

      login: (token, user) => set({ accessToken: token, user }),

      logout: () => set({ accessToken: null, user: null }),

      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'academy-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
