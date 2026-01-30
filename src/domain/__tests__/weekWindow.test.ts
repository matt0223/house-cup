import {
  getWeekWindowContaining,
  getCurrentWeekWindow,
} from '../services/weekWindow';

describe('weekWindow service', () => {
  describe('getWeekWindowContaining', () => {
    describe('with Sunday start (weekStartDay = 0)', () => {
      it('returns correct week for a Sunday', () => {
        // Jan 18, 2026 is a Sunday
        const window = getWeekWindowContaining('2026-01-18', 0);
        expect(window.startDayKey).toBe('2026-01-18'); // Sunday
        expect(window.endDayKey).toBe('2026-01-24'); // Saturday
        expect(window.dayKeys).toHaveLength(7);
      });

      it('returns correct week for a Wednesday', () => {
        // Jan 21, 2026 is a Wednesday
        const window = getWeekWindowContaining('2026-01-21', 0);
        expect(window.startDayKey).toBe('2026-01-18'); // Previous Sunday
        expect(window.endDayKey).toBe('2026-01-24'); // Saturday
      });

      it('returns correct week for a Saturday', () => {
        // Jan 24, 2026 is a Saturday
        const window = getWeekWindowContaining('2026-01-24', 0);
        expect(window.startDayKey).toBe('2026-01-18'); // Sunday
        expect(window.endDayKey).toBe('2026-01-24'); // This Saturday
      });
    });

    describe('with Monday start (weekStartDay = 1)', () => {
      it('returns correct week for a Monday', () => {
        // Jan 19, 2026 is a Monday
        const window = getWeekWindowContaining('2026-01-19', 1);
        expect(window.startDayKey).toBe('2026-01-19'); // Monday
        expect(window.endDayKey).toBe('2026-01-25'); // Sunday
        expect(window.dayKeys).toHaveLength(7);
      });

      it('returns correct week for a Wednesday', () => {
        // Jan 21, 2026 is a Wednesday
        const window = getWeekWindowContaining('2026-01-21', 1);
        expect(window.startDayKey).toBe('2026-01-19'); // Previous Monday
        expect(window.endDayKey).toBe('2026-01-25'); // Sunday
      });

      it('returns correct week for a Sunday', () => {
        // Jan 25, 2026 is a Sunday
        const window = getWeekWindowContaining('2026-01-25', 1);
        expect(window.startDayKey).toBe('2026-01-19'); // Monday
        expect(window.endDayKey).toBe('2026-01-25'); // This Sunday
      });
    });

    it('returns 7 consecutive days', () => {
      const window = getWeekWindowContaining('2026-01-21', 0);
      expect(window.dayKeys).toEqual([
        '2026-01-18',
        '2026-01-19',
        '2026-01-20',
        '2026-01-21',
        '2026-01-22',
        '2026-01-23',
        '2026-01-24',
      ]);
    });
  });
});
