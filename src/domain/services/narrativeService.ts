/**
 * Narrative Service
 *
 * Generates human-readable weekly narratives from challenge and task data.
 * Pure domain logic -- no React dependencies.
 */

import { Challenge, getChallengeDayKeys } from '../models/Challenge';
import { TaskInstance, getPointsForCompetitor } from '../models/TaskInstance';
import { Competitor } from '../models/Competitor';
import { calculateCompetitorTotal, calculateDailyScores } from './scoring';
import { formatDayKeyRange, getDayOfWeek } from './dayKey';

/**
 * A generated narrative for a completed week.
 */
export interface WeekNarrative {
  /** Short headline, e.g. "Closest finish yet" */
  headline: string;
  /** 1-2 sentence story about what made this week unique */
  body: string;
  /** Optional efficiency/insight tip */
  insightTip?: string;
  /** True when no interesting narrative angle was found (generic fallback) */
  isFallback?: boolean;
}

/** Day-of-week names for narratives */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Generate a narrative for a completed challenge week.
 *
 * Uses a priority-ranked system to pick the most interesting angle:
 * 1. Record-breakers (best week ever)
 * 2. Comeback stories (leader changed after mid-week)
 * 3. Day dominance (50%+ points on one day)
 * 4. Close call vs. blowout (margin compared to history)
 * 5. Task pattern shifts (new tasks or frequency changes)
 * 6. Fallback (simple factual summary)
 */
export function generateWeekNarrative(
  challenge: Challenge,
  tasks: TaskInstance[],
  competitors: Competitor[],
  allChallenges: Challenge[],
  allTasksByChallenge: Map<string, TaskInstance[]>,
): WeekNarrative {
  const compA = competitors[0];
  const compB = competitors[1];

  // Basic scores
  const scoreA = compA ? calculateCompetitorTotal(tasks, compA.id) : 0;
  const scoreB = compB ? calculateCompetitorTotal(tasks, compB.id) : 0;
  const totalTasks = tasks.length;
  const totalHouseholdPoints = scoreA + scoreB;
  const margin = Math.abs(scoreA - scoreB);

  // Winner info
  const winner = challenge.winnerId
    ? competitors.find((c) => c.id === challenge.winnerId) ?? null
    : null;
  const loser = winner && compA && compB
    ? (winner.id === compA.id ? compB : compA)
    : null;

  // Historical data for comparisons
  const historicalTotals = getHistoricalHouseholdTotals(allChallenges, allTasksByChallenge, competitors, challenge.id);
  const historicalMargins = getHistoricalMargins(allChallenges, allTasksByChallenge, competitors, challenge.id);

  // Try each narrative angle in priority order
  const narrative =
    tryRecordBreaker(totalTasks, totalHouseholdPoints, historicalTotals, winner, challenge, scoreA, scoreB, compA, compB) ??
    tryComeback(tasks, competitors, challenge, winner, loser, scoreA, scoreB, compA, compB) ??
    tryDayDominance(tasks, competitors, challenge, winner, scoreA, scoreB, compA, compB) ??
    tryCloseCallOrBlowout(margin, historicalMargins, challenge, winner, scoreA, scoreB, compA, compB) ??
    buildFallback(totalTasks, totalHouseholdPoints, challenge, winner, scoreA, scoreB, compA, compB);

  // Try to generate an efficiency tip
  const insightTip = generateInsightTip(tasks, allChallenges, challenge.id);

  return {
    ...narrative,
    insightTip: insightTip ?? narrative.insightTip,
  };
}

/**
 * Generate a simpler narrative for the celebration overlay (no historical context needed).
 */
export function generateCelebrationNarrative(
  challenge: Challenge,
  tasks: TaskInstance[],
  competitors: Competitor[],
): WeekNarrative {
  const emptyMap = new Map<string, TaskInstance[]>();
  return generateWeekNarrative(challenge, tasks, competitors, [], emptyMap);
}

// ---------------------------------------------------------------------------
// Narrative angle helpers
// ---------------------------------------------------------------------------

function getHistoricalHouseholdTotals(
  allChallenges: Challenge[],
  allTasksByChallenge: Map<string, TaskInstance[]>,
  competitors: Competitor[],
  excludeChallengeId: string,
): number[] {
  return allChallenges
    .filter((c) => c.id !== excludeChallengeId && c.isCompleted)
    .map((c) => {
      const cTasks = allTasksByChallenge.get(c.id) ?? [];
      return competitors.reduce(
        (sum, comp) => sum + calculateCompetitorTotal(cTasks, comp.id),
        0,
      );
    });
}

function getHistoricalMargins(
  allChallenges: Challenge[],
  allTasksByChallenge: Map<string, TaskInstance[]>,
  competitors: Competitor[],
  excludeChallengeId: string,
): number[] {
  if (competitors.length < 2) return [];
  return allChallenges
    .filter((c) => c.id !== excludeChallengeId && c.isCompleted)
    .map((c) => {
      const cTasks = allTasksByChallenge.get(c.id) ?? [];
      const sA = calculateCompetitorTotal(cTasks, competitors[0].id);
      const sB = calculateCompetitorTotal(cTasks, competitors[1].id);
      return Math.abs(sA - sB);
    });
}

/** 1. Record-breaker: best household output ever */
function tryRecordBreaker(
  totalTasks: number,
  totalPoints: number,
  historicalTotals: number[],
  winner: Competitor | null,
  challenge: Challenge,
  scoreA: number,
  scoreB: number,
  compA?: Competitor,
  compB?: Competitor,
): WeekNarrative | null {
  if (historicalTotals.length === 0) return null;

  const maxHistorical = Math.max(...historicalTotals);
  if (totalPoints <= maxHistorical) return null;

  return {
    headline: 'New household record',
    body: `${totalTasks} tasks knocked out together — your most productive week yet.`,
  };
}

/** 2. Comeback: leader changed after mid-week */
function tryComeback(
  tasks: TaskInstance[],
  competitors: Competitor[],
  challenge: Challenge,
  winner: Competitor | null,
  loser: Competitor | null,
  scoreA: number,
  scoreB: number,
  compA?: Competitor,
  compB?: Competitor,
): WeekNarrative | null {
  if (competitors.length < 2 || !winner || !loser) return null;

  const dayKeys = getChallengeDayKeys(challenge);
  if (dayKeys.length < 5) return null;

  // Calculate cumulative scores through mid-week (first 4 days)
  const midDayKeys = new Set(dayKeys.slice(0, 4));
  const midTasks = tasks.filter((t) => midDayKeys.has(t.dayKey));
  const midScoreWinner = calculateCompetitorTotal(midTasks, winner.id);
  const midScoreLoser = calculateCompetitorTotal(midTasks, loser.id);

  // Did the eventual winner trail at mid-week?
  if (midScoreWinner >= midScoreLoser) return null;

  const deficit = midScoreLoser - midScoreWinner;

  return {
    headline: 'What a comeback',
    body: `${winner.name} trailed by ${deficit} points through mid-week but surged ahead to take it.`,
  };
}

/** 3. Day dominance: one competitor got 50%+ of points on a single day */
function tryDayDominance(
  tasks: TaskInstance[],
  competitors: Competitor[],
  challenge: Challenge,
  winner: Competitor | null,
  scoreA: number,
  scoreB: number,
  compA?: Competitor,
  compB?: Competitor,
): WeekNarrative | null {
  for (const comp of competitors) {
    const total = calculateCompetitorTotal(tasks, comp.id);
    if (total === 0) continue;

    const dailyScores = calculateDailyScores(tasks, comp.id);
    for (const [dayKey, dayScore] of dailyScores) {
      if (dayScore / total >= 0.5 && dayScore >= 6) {
        const dayOfWeek = getDayOfWeek(dayKey);
        const dayName = DAY_NAMES[dayOfWeek];

        return {
          headline: `${comp.name}'s big ${dayName}`,
          body: `${comp.name} racked up ${dayScore} points on ${dayName} alone — over half their weekly total.`,
        };
      }
    }
  }
  return null;
}

/** 4. Close call or blowout compared to historical margins */
function tryCloseCallOrBlowout(
  margin: number,
  historicalMargins: number[],
  challenge: Challenge,
  winner: Competitor | null,
  scoreA: number,
  scoreB: number,
  compA?: Competitor,
  compB?: Competitor,
): WeekNarrative | null {
  if (historicalMargins.length === 0) return null;

  const minHistorical = Math.min(...historicalMargins);
  const maxHistorical = Math.max(...historicalMargins);
  const avgMargin = historicalMargins.reduce((a, b) => a + b, 0) / historicalMargins.length;

  // Closest finish
  if (margin <= minHistorical && margin <= 5) {
    if (challenge.isTie) {
      return {
        headline: 'Dead heat',
        body: `Finished in a tie at ${scoreA} points each.`,
      };
    }
    return {
      headline: 'Closest finish yet',
      body: `Just ${margin} point${margin === 1 ? '' : 's'} separated the two of you.`,
    };
  }

  // Biggest blowout
  if (margin >= maxHistorical && margin > avgMargin * 1.5 && historicalMargins.length >= 2) {
    return {
      headline: 'Dominant week',
      body: `${winner?.name ?? 'The winner'} ran away with it — the biggest margin in your household's history.`,
    };
  }

  return null;
}

/** 6. Fallback: simple factual summary */
function buildFallback(
  totalTasks: number,
  totalPoints: number,
  challenge: Challenge,
  winner: Competitor | null,
  scoreA: number,
  scoreB: number,
  compA?: Competitor,
  compB?: Competitor,
): WeekNarrative {
  return {
    headline: `${totalTasks} tasks done together`,
    body: `Another week in the books for your household.`,
    isFallback: true,
  };
}


// ---------------------------------------------------------------------------
// Efficiency tip generation
// ---------------------------------------------------------------------------

/** Generate an optional insight tip based on task frequency patterns */
function generateInsightTip(
  tasks: TaskInstance[],
  allChallenges: Challenge[],
  currentChallengeId: string,
): string | null {
  // Only show tips if there's enough history (don't tip on first week)
  const completedCount = allChallenges.filter((c) => c.isCompleted && c.id !== currentChallengeId).length;
  if (completedCount < 1) return null;

  // Group tasks by name and count frequency
  const taskFrequency = new Map<string, number>();
  for (const task of tasks) {
    const name = task.name.toLowerCase().trim();
    taskFrequency.set(name, (taskFrequency.get(name) ?? 0) + 1);
  }

  // Find tasks that appear 4+ times in a week
  const frequentTasks: Array<{ name: string; count: number }> = [];
  for (const [name, count] of taskFrequency) {
    if (count >= 4) {
      frequentTasks.push({ name, count });
    }
  }

  if (frequentTasks.length === 0) return null;

  // Pick the most frequent
  frequentTasks.sort((a, b) => b.count - a.count);
  const top = frequentTasks[0];
  const originalName = tasks.find((t) => t.name.toLowerCase().trim() === top.name)?.name ?? top.name;

  // Generate contextual tip based on task name keywords
  const nameLower = top.name;

  if (nameLower.includes('laundry') || nameLower.includes('wash') || nameLower.includes('clothes')) {
    return `"${originalName}" came up ${top.count} times this week. A pickup laundry service could save a few hours.`;
  }

  if (nameLower.includes('lunch') || nameLower.includes('meal') || nameLower.includes('cook') || nameLower.includes('dinner') || nameLower.includes('food') || nameLower.includes('prep')) {
    return `"${originalName}" came up ${top.count} times this week. Batch prepping on Sunday could free up time during the week.`;
  }

  if (nameLower.includes('clean') || nameLower.includes('sweep') || nameLower.includes('mop') || nameLower.includes('vacuum')) {
    return `"${originalName}" came up ${top.count} times this week. A quick daily 10-minute tidy might reduce the bigger clean sessions.`;
  }

  if (nameLower.includes('dishes') || nameLower.includes('dishwasher')) {
    return `"${originalName}" came up ${top.count} times this week. Running the dishwasher right after dinner could simplify the routine.`;
  }

  // Generic tip
  return `"${originalName}" came up ${top.count} times this week. Could any of those be batched or simplified?`;
}
