import { create } from 'zustand';
import { Competitor } from '../domain/models/Competitor';
import { Household, WeekStartDay, sampleHousehold } from '../domain/models/Household';

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
}

type HouseholdStore = HouseholdState & HouseholdActions;

/**
 * Zustand store for household data.
 * Contains competitors, timezone, and week configuration.
 */
export const useHouseholdStore = create<HouseholdStore>((set, get) => ({
  // Initial state
  household: null,
  isLoading: false,
  error: null,

  // Actions
  setHousehold: (household) => {
    set({ household, error: null });
  },

  updateSettings: (updates) => {
    const { household } = get();
    if (!household) return;

    set({
      household: {
        ...household,
        ...updates,
      },
    });
  },

  updateCompetitor: (competitorId, updates) => {
    const { household } = get();
    if (!household) return;

    const updatedCompetitors = household.competitors.map((c) =>
      c.id === competitorId ? { ...c, ...updates } : c
    ) as [Competitor, Competitor];

    set({
      household: {
        ...household,
        competitors: updatedCompetitors,
      },
    });
  },

  clearHousehold: () => {
    set({ household: null, error: null });
  },

  loadSampleData: () => {
    set({ household: sampleHousehold, error: null });
  },
}));

// Selector hooks for common access patterns
export const useCompetitors = () =>
  useHouseholdStore((state) => state.household?.competitors ?? []);

export const useTimezone = () =>
  useHouseholdStore((state) => state.household?.timezone ?? 'UTC');

export const useWeekStartDay = () =>
  useHouseholdStore((state) => state.household?.weekStartDay ?? 0);
