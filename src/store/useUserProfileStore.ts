import { create } from 'zustand';
import { ThemePreference } from '../domain/models/Household';
import * as userService from '../services/firebase/userService';

interface UserProfileState {
  themePreference: ThemePreference;
}

interface UserProfileActions {
  setThemePreference: (preference: ThemePreference, userId: string | null) => void;
  /** Called by Firestore subscription; do not use for user-initiated changes */
  setThemePreferenceFromSync: (preference: ThemePreference) => void;
  /** Reset to defaults (e.g. on sign out) */
  clearUserProfile: () => void;
}

const defaultTheme: ThemePreference = 'system';

type UserProfileStore = UserProfileState & UserProfileActions;

export const useUserProfileStore = create<UserProfileStore>((set, get) => ({
  themePreference: defaultTheme,

  setThemePreference: (preference, userId) => {
    set({ themePreference: preference });
    if (userId) {
      userService.updateUserProfile(userId, { themePreference: preference }).catch((err) => {
        console.error('Failed to sync theme preference:', err);
      });
    }
  },

  setThemePreferenceFromSync: (preference) => {
    set({ themePreference: preference });
  },

  clearUserProfile: () => {
    set({ themePreference: defaultTheme });
  },
}));

export const useThemePreference = (): ThemePreference =>
  useUserProfileStore((s) => s.themePreference);
