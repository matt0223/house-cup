/**
 * Represents a 7-day challenge period.
 * Challenges are the scoring window for the House Cup competition.
 */
export interface Challenge {
  /** Unique identifier */
  id: string;

  /** Household this challenge belongs to */
  householdId: string;

  /** Start date of the challenge (dayKey format: yyyy-MM-dd) */
  startDayKey: string;

  /** End date of the challenge (dayKey format: yyyy-MM-dd) */
  endDayKey: string;

  /** Prize text for the winner */
  prize: string;

  /** Winner's competitor ID (null if challenge not ended or tie) */
  winnerId: string | null;

  /** Whether the challenge ended in a tie */
  isTie: boolean;

  /** Whether this challenge is completed (read-only) */
  isCompleted: boolean;

  /** When the challenge was created */
  createdAt: string;

  /** LLM-generated narrative (written by Cloud Function after completion) */
  narrative?: {
    headline: string;
    body: string;
    insightTip?: string;
  };
}

/**
 * Get all dayKeys in a challenge window (inclusive).
 */
export function getChallengeDayKeys(challenge: Challenge): string[] {
  const dayKeys: string[] = [];
  const start = new Date(challenge.startDayKey + 'T12:00:00Z');
  const end = new Date(challenge.endDayKey + 'T12:00:00Z');

  const current = new Date(start);
  while (current <= end) {
    dayKeys.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dayKeys;
}
