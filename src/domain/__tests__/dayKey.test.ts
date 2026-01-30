import {
  formatDateToDayKey,
  parseDayKey,
  getDayOfWeek,
  addDays,
  daysBetween,
  isDayKeyInRange,
  getDayKeysInRange,
  getDayLabel,
  formatDayKeyRange,
} from '../services/dayKey';

describe('dayKey utilities', () => {
  describe('formatDateToDayKey', () => {
    it('formats a date to yyyy-MM-dd in the given timezone', () => {
      // Jan 15, 2026 at noon UTC
      const date = new Date('2026-01-15T12:00:00Z');
      expect(formatDateToDayKey(date, 'UTC')).toBe('2026-01-15');
    });

    it('handles timezone offset correctly', () => {
      // Jan 15, 2026 at 3am UTC is still Jan 14 in NYC (EST = UTC-5)
      const date = new Date('2026-01-15T03:00:00Z');
      expect(formatDateToDayKey(date, 'America/New_York')).toBe('2026-01-14');
    });
  });

  describe('parseDayKey', () => {
    it('parses a dayKey to a Date at noon UTC', () => {
      const date = parseDayKey('2026-01-15');
      expect(date.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    });
  });

  describe('getDayOfWeek', () => {
    it('returns correct day of week (0=Sunday)', () => {
      // Jan 18, 2026 is a Sunday
      expect(getDayOfWeek('2026-01-18')).toBe(0);
      // Jan 19, 2026 is a Monday
      expect(getDayOfWeek('2026-01-19')).toBe(1);
      // Jan 24, 2026 is a Saturday
      expect(getDayOfWeek('2026-01-24')).toBe(6);
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2026-01-15', 5)).toBe('2026-01-20');
    });

    it('adds negative days', () => {
      expect(addDays('2026-01-15', -5)).toBe('2026-01-10');
    });

    it('handles month boundaries', () => {
      expect(addDays('2026-01-30', 5)).toBe('2026-02-04');
    });
  });

  describe('daysBetween', () => {
    it('calculates difference in days', () => {
      expect(daysBetween('2026-01-15', '2026-01-20')).toBe(5);
      expect(daysBetween('2026-01-20', '2026-01-15')).toBe(-5);
    });

    it('returns 0 for same day', () => {
      expect(daysBetween('2026-01-15', '2026-01-15')).toBe(0);
    });
  });

  describe('isDayKeyInRange', () => {
    it('returns true for days in range', () => {
      expect(isDayKeyInRange('2026-01-15', '2026-01-10', '2026-01-20')).toBe(true);
    });

    it('returns true for boundary days', () => {
      expect(isDayKeyInRange('2026-01-10', '2026-01-10', '2026-01-20')).toBe(true);
      expect(isDayKeyInRange('2026-01-20', '2026-01-10', '2026-01-20')).toBe(true);
    });

    it('returns false for days outside range', () => {
      expect(isDayKeyInRange('2026-01-05', '2026-01-10', '2026-01-20')).toBe(false);
      expect(isDayKeyInRange('2026-01-25', '2026-01-10', '2026-01-20')).toBe(false);
    });
  });

  describe('getDayKeysInRange', () => {
    it('returns all days in range', () => {
      const days = getDayKeysInRange('2026-01-15', '2026-01-17');
      expect(days).toEqual(['2026-01-15', '2026-01-16', '2026-01-17']);
    });

    it('returns single day for same start/end', () => {
      const days = getDayKeysInRange('2026-01-15', '2026-01-15');
      expect(days).toEqual(['2026-01-15']);
    });

    it('returns 7 days for a week', () => {
      const days = getDayKeysInRange('2026-01-18', '2026-01-24');
      expect(days).toHaveLength(7);
    });
  });

  describe('getDayLabel', () => {
    it('returns single letter labels', () => {
      expect(getDayLabel('2026-01-18')).toBe('S'); // Sunday
      expect(getDayLabel('2026-01-19')).toBe('M'); // Monday
      expect(getDayLabel('2026-01-24')).toBe('S'); // Saturday
    });
  });

  describe('formatDayKeyRange', () => {
    it('formats a date range for display', () => {
      const result = formatDayKeyRange('2026-01-24', '2026-01-30');
      expect(result).toBe('Jan 24 - Jan 30');
    });
  });
});
