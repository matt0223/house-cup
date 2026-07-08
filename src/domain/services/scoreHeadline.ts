import { Competitor } from '../models/Competitor';

/**
 * One piece of the score headline sentence. Segments with a competitorId
 * are rendered in that competitor's color (the leader's name); all other
 * segments render in the primary text color.
 */
export interface HeadlineSegment {
  text: string;
  competitorId?: string;
}

/**
 * Word joiner — glued around the en dash so the score pair ("35–33") never
 * breaks across lines when the headline wraps.
 */
const WJ = '\u2060';

function scorePair(leaderScore: number, trailerScore: number): string {
  return `${leaderScore}${WJ}–${WJ}${trailerScore}`;
}

export interface HeadlineInput {
  competitor: Competitor;
  score: number;
}

/**
 * Build the home-screen headline sentence for the current scores.
 *
 * - Solo (no housemate yet): counts instead of compares ("12 points this week").
 * - Both at zero: "New week, 0–0".
 * - Tied: "Tied, 33–33".
 * - Otherwise: "<Leader> leads, 35–33" with the leader's score first and the
 *   leader's name tinted in their color.
 */
export function buildScoreHeadline(
  a: HeadlineInput,
  b?: HeadlineInput | null
): HeadlineSegment[] {
  if (!b) {
    if (a.score === 0) {
      return [{ text: 'New week, 0 points' }];
    }
    return [{ text: `${a.score} point${a.score === 1 ? '' : 's'} this week` }];
  }

  if (a.score === b.score) {
    if (a.score === 0) {
      return [{ text: `New week, ${scorePair(0, 0)}` }];
    }
    return [{ text: `Tied, ${scorePair(a.score, b.score)}` }];
  }

  const leader = a.score > b.score ? a : b;
  const trailer = leader === a ? b : a;
  return [
    { text: leader.competitor.name, competitorId: leader.competitor.id },
    { text: ` leads, ${scorePair(leader.score, trailer.score)}` },
  ];
}

/**
 * The prize support line under the headline.
 * "Up for grabs" while the week is untouched, "Playing for" once it's live.
 */
export function prizeLineLabel(prize: string, bothScoresZero: boolean): string {
  if (!prize) return "Set this week's prize";
  return bothScoresZero ? `Up for grabs: ${prize}` : `Playing for: ${prize}`;
}
