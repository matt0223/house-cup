/**
 * State Management
 *
 * Zustand stores for House Cup.
 */

export {
  useHouseholdStore,
  useCompetitors,
  useTimezone,
  useWeekStartDay,
} from './useHouseholdStore';

export {
  useChallengeStore,
  useSelectedDayKey,
  useCurrentChallenge,
  useTasksForSelectedDay,
  useAllTasks,
} from './useChallengeStore';

export {
  useRecurringStore,
  useTemplates,
  useSkipRecords,
} from './useRecurringStore';

export { useUserProfileStore, useThemePreference } from './useUserProfileStore';

export {
  useInsightsStore,
  useInsightWeeks,
  useInsightsLoading,
  useInsightsTotalTasks,
  useInsightsTotalWeeks,
  type EnrichedChallenge,
} from './useInsightsStore';
