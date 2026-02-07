/**
 * Insights Store
 *
 * Manages state for the Insights page: completed challenges,
 * their tasks, and generated narratives.
 */

import { create } from 'zustand';
import { Challenge } from '../domain/models/Challenge';
import { TaskInstance } from '../domain/models/TaskInstance';
import { Competitor } from '../domain/models/Competitor';
import { WeekNarrative, generateWeekNarrative } from '../domain/services/narrativeService';
import { calculateCompetitorTotal } from '../domain/services/scoring';
import * as challengeService from '../services/firebase/challengeService';
import * as taskService from '../services/firebase/taskService';

/**
 * Enriched challenge data with scores and narrative for display.
 */
export interface EnrichedChallenge {
  challenge: Challenge;
  tasks: TaskInstance[];
  scoreA: number;
  scoreB: number;
  narrative: WeekNarrative;
}

/**
 * Insights store state
 */
interface InsightsState {
  /** Enriched challenge data for display, most recent first */
  weeks: EnrichedChallenge[];

  /** Total tasks across all completed challenges */
  totalTasks: number;

  /** Total completed challenge count */
  totalWeeks: number;

  /** Whether data is loading */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;
}

/**
 * Insights store actions
 */
interface InsightsActions {
  /** Load completed challenges, their tasks, and generate narratives */
  loadHistory: (householdId: string, competitors: Competitor[]) => Promise<void>;

  /** Clear insights state */
  clear: () => void;
}

type InsightsStore = InsightsState & InsightsActions;

const initialState: InsightsState = {
  weeks: [],
  totalTasks: 0,
  totalWeeks: 0,
  isLoading: false,
  error: null,
};

/**
 * Zustand store for Insights page data.
 */
export const useInsightsStore = create<InsightsStore>((set, get) => ({
  ...initialState,

  loadHistory: async (householdId: string, competitors: Competitor[]) => {
    set({ isLoading: true, error: null });

    try {
      // Fetch completed challenges (most recent first, max 20)
      const challenges = await challengeService.getCompletedChallenges(householdId, 20);

      if (challenges.length === 0) {
        set({ weeks: [], totalTasks: 0, totalWeeks: 0, isLoading: false });
        return;
      }

      // Fetch tasks for each challenge in parallel
      const taskPromises = challenges.map((c) =>
        taskService.getTasksForChallenge(householdId, c.id),
      );
      const taskArrays = await Promise.all(taskPromises);

      // Build the tasks-by-challenge map for narrative context
      const tasksByChallenge = new Map<string, TaskInstance[]>();
      challenges.forEach((c, i) => {
        tasksByChallenge.set(c.id, taskArrays[i]);
      });

      // Calculate total tasks across all challenges
      const totalTasks = taskArrays.reduce((sum, arr) => sum + arr.length, 0);

      // Generate narratives for each challenge.
      // If the challenge has an LLM-generated narrative from the Cloud Function,
      // use it directly. Otherwise fall back to the client-side rule-based system.
      const weeks: EnrichedChallenge[] = challenges.map((challenge, i) => {
        const tasks = taskArrays[i];
        const compA = competitors[0];
        const compB = competitors[1];

        const scoreA = compA ? calculateCompetitorTotal(tasks, compA.id) : 0;
        const scoreB = compB ? calculateCompetitorTotal(tasks, compB.id) : 0;

        const narrative: WeekNarrative = challenge.narrative
          ? {
              headline: challenge.narrative.headline,
              body: challenge.narrative.body,
              insightTip: challenge.narrative.insightTip,
            }
          : generateWeekNarrative(
              challenge,
              tasks,
              competitors,
              challenges,
              tasksByChallenge,
            );

        return { challenge, tasks, scoreA, scoreB, narrative };
      });

      set({
        weeks,
        totalTasks,
        totalWeeks: challenges.length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load insights:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load insights',
      });
    }
  },

  clear: () => set(initialState),
}));

/** Selector: get enriched weeks */
export const useInsightWeeks = () => useInsightsStore((s) => s.weeks);

/** Selector: get loading state */
export const useInsightsLoading = () => useInsightsStore((s) => s.isLoading);

/** Selector: get total tasks */
export const useInsightsTotalTasks = () => useInsightsStore((s) => s.totalTasks);

/** Selector: get total weeks */
export const useInsightsTotalWeeks = () => useInsightsStore((s) => s.totalWeeks);
