import {
  calculateCompetitorTotal,
  calculateChallengeScores,
  calculateDailyScores,
  calculateDayCompletion,
} from '../services/scoring';
import { TaskInstance } from '../models/TaskInstance';
import { Competitor } from '../models/Competitor';

describe('scoring service', () => {
  const competitorA: Competitor = {
    id: 'competitor-a',
    name: 'Pri',
    color: '#9B7FD1',
  };

  const competitorB: Competitor = {
    id: 'competitor-b',
    name: 'Matt',
    color: '#5B9BD5',
  };

  const competitors = [competitorA, competitorB];

  const createTask = (
    id: string,
    dayKey: string,
    pointsA: number,
    pointsB: number
  ): TaskInstance => ({
    id,
    challengeId: 'challenge-1',
    dayKey,
    name: `Task ${id}`,
    templateId: null,
    points: {
      'competitor-a': pointsA,
      'competitor-b': pointsB,
    },
    createdAt: '2026-01-19T00:00:00Z',
    updatedAt: '2026-01-19T00:00:00Z',
  });

  describe('calculateCompetitorTotal', () => {
    it('sums points across all tasks', () => {
      const tasks = [
        createTask('1', '2026-01-19', 2, 1),
        createTask('2', '2026-01-19', 3, 2),
        createTask('3', '2026-01-20', 1, 3),
      ];

      expect(calculateCompetitorTotal(tasks, 'competitor-a')).toBe(6);
      expect(calculateCompetitorTotal(tasks, 'competitor-b')).toBe(6);
    });

    it('returns 0 for empty task list', () => {
      expect(calculateCompetitorTotal([], 'competitor-a')).toBe(0);
    });

    it('returns 0 for competitor with no points', () => {
      const tasks = [createTask('1', '2026-01-19', 0, 3)];
      expect(calculateCompetitorTotal(tasks, 'competitor-a')).toBe(0);
    });
  });

  describe('calculateChallengeScores', () => {
    it('determines winner correctly', () => {
      const tasks = [
        createTask('1', '2026-01-19', 3, 1),
        createTask('2', '2026-01-20', 2, 1),
      ];

      const result = calculateChallengeScores(tasks, competitors);

      expect(result.winnerId).toBe('competitor-a');
      expect(result.isTie).toBe(false);
      expect(result.scores).toHaveLength(2);
    });

    it('detects tie', () => {
      const tasks = [
        createTask('1', '2026-01-19', 2, 2),
        createTask('2', '2026-01-20', 1, 1),
      ];

      const result = calculateChallengeScores(tasks, competitors);

      expect(result.winnerId).toBeNull();
      expect(result.isTie).toBe(true);
    });

    it('handles empty task list', () => {
      const result = calculateChallengeScores([], competitors);

      expect(result.winnerId).toBeNull();
      expect(result.isTie).toBe(true); // 0-0 is a tie
    });
  });

  describe('calculateDailyScores', () => {
    it('groups scores by day', () => {
      const tasks = [
        createTask('1', '2026-01-19', 2, 0),
        createTask('2', '2026-01-19', 1, 0),
        createTask('3', '2026-01-20', 3, 0),
      ];

      const result = calculateDailyScores(tasks, 'competitor-a');

      expect(result.get('2026-01-19')).toBe(3);
      expect(result.get('2026-01-20')).toBe(3);
    });
  });

  describe('calculateDayCompletion', () => {
    it('calculates percentage correctly', () => {
      const tasks = [
        createTask('1', '2026-01-19', 3, 0), // Max points
        createTask('2', '2026-01-19', 0, 0), // No points
      ];

      // 3 out of 6 max = 50%
      expect(calculateDayCompletion(tasks, 'competitor-a')).toBe(50);
    });

    it('returns 100 for all max points', () => {
      const tasks = [
        createTask('1', '2026-01-19', 3, 0),
        createTask('2', '2026-01-19', 3, 0),
      ];

      expect(calculateDayCompletion(tasks, 'competitor-a')).toBe(100);
    });

    it('returns 0 for empty task list', () => {
      expect(calculateDayCompletion([], 'competitor-a')).toBe(0);
    });

    it('returns 0 for no points', () => {
      const tasks = [createTask('1', '2026-01-19', 0, 0)];
      expect(calculateDayCompletion(tasks, 'competitor-a')).toBe(0);
    });
  });
});
