/**
 * Demo session store.
 *
 * In production the session comes from the identity provider (FSD-C07); here a
 * sign-in screen and a role switcher let reviewers of the demo see how the
 * permission-aware UI changes. Frontend permissions are presentation only.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RoleCode, User } from '@/types/domain';
import { demoUsers } from '@/mocks/data/core';
import { hasPermission, type PermissionKey } from '@/utils/permissions';

interface AuthState {
  user: User;
  authenticated: boolean;
  activeRegionId: string | 'all';
  signIn: (userId: string) => void;
  signOut: () => void;
  setUserById: (id: string) => void;
  setActiveRegion: (id: string | 'all') => void;
  can: (key: PermissionKey) => boolean;
  roles: () => RoleCode[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  user: demoUsers[0],
  authenticated: false,
  activeRegionId: 'all',
  signIn: (userId) => {
    const found = demoUsers.find((u) => u.id === userId) ?? demoUsers[0];
    set({ user: found, authenticated: true });
  },
  signOut: () => set({ authenticated: false }),
  setUserById: (id) => {
    const found = demoUsers.find((u) => u.id === id);
    if (found) set({ user: found });
  },
  setActiveRegion: (id) => set({ activeRegionId: id }),
      can: (key) => hasPermission(get().user.roles, key),
      roles: () => get().user.roles,
    }),
    {
      // session-scoped: a demo reviewer stays signed in across reloads,
      // but closing the tab ends the session.
      name: 'tuip.session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        authenticated: state.authenticated,
        activeRegionId: state.activeRegionId,
      }),
    },
  ),
);

export const demoPersonas = demoUsers;
