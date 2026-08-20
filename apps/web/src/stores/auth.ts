import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  phone?: string | null;
  agentStatus?: string | null;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  setSession: (tokens: { accessToken: string; refreshToken: string } | null, user?: SessionUser) => void;
  setUser: (user: SessionUser) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (tokens, user) =>
        set({ accessToken: tokens?.accessToken ?? null, refreshToken: tokens?.refreshToken ?? null, user: user ?? undefined }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'wa-auth' },
  ),
);