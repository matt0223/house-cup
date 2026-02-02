import { create } from 'zustand';
import { Competitor } from '../domain/models/Competitor';
import { Household, WeekStartDay, ThemePreference, sampleHousehold } from '../domain/models/Household';
import * as householdService from '../services/firebase/householdService';

/**
 * Household store state
 */
interface HouseholdState {
  /** Current household (null if not set up) */
  household: Household | null;

  /** Whether household is loading */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;

  /** Whether Firebase sync is enabled */
  syncEnabled: boolean;
}

/**
 * Household store actions
 */
interface HouseholdActions {
  /** Set the current household */
  setHousehold: (household: Household) => void;

  /** Update household settings */
  updateSettings: (updates: {
    timezone?: string;
    weekStartDay?: WeekStartDay;
    prize?: string;
    themePreference?: ThemePreference;
  }) => void;

  /** Update a competitor's details */
  updateCompetitor: (
    competitorId: string,
    updates: { name?: string; color?: string }
  ) => void;

  /** Clear household (logout) */
  clearHousehold: () => void;

  /** Load sample data for development */
  loadSampleData: () => void;

  /** Enable/disable Firebase sync */
  setSyncEnabled: (enabled: boolean) => void;
}

type HouseholdStore = HouseholdState & HouseholdActions;

/**
 * Zustand store for household data.
 * Contains competitors, timezone, and week configuration.
 *
 * When syncEnabled is true, mutations are persisted to Firestore.
 */
export const useHouseholdStore = create<HouseholdStore>((set, get) => ({
  // Initial state
  household: null,
  isLoading: false,
  error: null,
  syncEnabled: false,

  // Actions
  setHousehold: (household) => {
    set({ household, error: null });
  },

  updateSettings: (updates) => {
    const { household, syncEnabled } = get();
    if (!household) return;

    // Optimistic update
    set({
      household: {
        ...household,
        ...updates,
      },
    });

    // Persist to Firestore
    if (syncEnabled) {
      householdService.updateHousehold(household.id, updates).catch((error) => {
        console.error('Failed to sync settings update:', error);
        set({ error: `Sync failed: ${error.message}` });
      });
    }
  },

  updateCompetitor: (competitorId, updates) => {
    const { household, syncEnabled } = get();
    if (!household) return;

    const competitorIndex = household.competitors.findIndex(
      (c) => c.id === competitorId
    );
    if (competitorIndex === -1) return;

    const updatedCompetitors = household.competitors.map((c) =>
      c.id === competitorId ? { ...c, ...updates } : c
    );

    // Optimistic update
    set({
      household: {
        ...household,
        competitors: updatedCompetitors,
      },
    });

    // Persist to Firestore
    if (syncEnabled) {
      householdService
        .updateCompetitor(household.id, competitorIndex, updates)
        .catch((error) => {
          console.error('Failed to sync competitor update:', error);
          set({ error: `Sync failed: ${error.message}` });
        });
    }
  },

  clearHousehold: () => {
    set({ household: null, error: null });
  },

  loadSampleData: () => {
    set({ household: sampleHousehold, error: null });
  },

  setSyncEnabled: (enabled) => {
    set({ syncEnabled: enabled });
  },
}));

// Selector hooks for common access patterns
export const useCompetitors = () =>
  useHouseholdStore((state) => state.household?.competitors ?? []);

export const useTimezone = () =>
  useHouseholdStore((state) => state.household?.timezone ?? 'UTC');

export const useWeekStartDay = () =>
  useHouseholdStore((state) => state.household?.weekStartDay ?? 0);

export const useThemePreference = () =>
  useHouseholdStore((state) => state.household?.themePreference ?? 'system');
