/**
 * Scoring Service
 *
 * Calculates points totals for the House Cup competition.
 */

import { TaskInstance, getPointsForCompetitor } from '../models/TaskInstance';
import { Competitor } from '../models/Competitor';

/**
 * Score for a single competitor.
 */
export interface CompetitorScore {
  competitorId: string;
  total: number;
}

/**
 * Scores for all competitors in a challenge.
 */
export interface ChallengeScores {
  scores: CompetitorScore[];
  winnerId: string | null;
  isTie: boolean;
}

/**
 * Calculate the total score for a competitor across all tasks.
 *
 * @param tasks - Task instances to sum
 * @param competitorId - Competitor to calculate for
 * @returns Total points
 */
export function calculateCompetitorTotal(
  tasks: TaskInstance[],
  competitorId: string
): number {
  return tasks.reduce(
    (sum, task) => sum + getPointsForCompetitor(task, competitorId),
    0
  );
}

/**
 * Calculate scores for all competitors.
 *
 * @param tasks - Task instances in the challenge
 * @param competitors - Competitors in the household
 * @returns Scores with winner determination
 */
export function calculateChallengeScores(
  tasks: TaskInstance[],
  competitors: Competitor[]
): ChallengeScores {
  const scores: CompetitorScore[] = competitors.map((c) => ({
    competitorId: c.id,
    total: calculateCompetitorTotal(tasks, c.id),
  }));

  // Sort by total descending
  const sorted = [...scores].sort((a, b) => b.total - a.total);

  // Determine winner
  let winnerId: string | null = null;
  let isTie = false;

  if (sorted.length >= 2) {
    if (sorted[0].total > sorted[1].total) {
      winnerId = sorted[0].competitorId;
    } else if (sorted[0].total === sorted[1].total) {
      isTie = true;
    }
  } else if (sorted.length === 1) {
    winnerId = sorted[0].competitorId;
  }

  return { scores, winnerId, isTie };
}

/**
 * Calculate daily scores for a competitor.
 *
 * @param tasks - Task instances
 * @param competitorId - Competitor to calculate for
 * @returns Map of dayKey to total points
 */
export function calculateDailyScores(
  tasks: TaskInstance[],
  competitorId: string
): Map<string, number> {
  const dailyScores = new Map<string, number>();

  for (const task of tasks) {
    const points = getPointsForCompetitor(task, competitorId);
    const current = dailyScores.get(task.dayKey) ?? 0;
    dailyScores.set(task.dayKey, current + points);
  }

  return dailyScores;
}

/**
 * Get the maximum possible points for a day.
 * Each task can have 0-3 points, so max = 3 * number of tasks.
 */
export function getMaxPossiblePoints(taskCount: number): number {
  return taskCount * 3;
}

/**
 * Calculate completion percentage for a competitor on a day.
 *
 * @param tasks - Tasks for the day
 * @param competitorId - Competitor to check
 * @returns Percentage (0-100) of points earned vs max possible
 */
export function calculateDayCompletion(
  tasks: TaskInstance[],
  competitorId: string
): number {
  if (tasks.length === 0) return 0;

  const earned = calculateCompetitorTotal(tasks, competitorId);
  const max = getMaxPossiblePoints(tasks.length);

  return Math.round((earned / max) * 100);
}
