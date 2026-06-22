import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser, ProfileData } from '../types/auth';

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  profile: ProfileData | null;
  hydrated: boolean;
  isGuest: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setProfile: (profile: ProfileData) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  updateProfile: (updates: Partial<ProfileData>) => void;
  signOut: () => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      profile: null,
      hydrated: false,
      isGuest: false,

      setAuth: (token, user) => set({ token, user, isGuest: false }),

      setProfile: (profile) => set({ profile }),

      updateUser: (updates) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...updates } });
      },

      updateProfile: (updates) => {
        const current = get().profile;
        set({ profile: current ? { ...current, ...updates } : (updates as ProfileData) });
      },

      signOut: () => set({ user: null, token: null, profile: null, isGuest: false }),

      enterGuestMode: () => set({ isGuest: true }),
      exitGuestMode: () => set({ isGuest: false }),

      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'fitflow-auth-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
