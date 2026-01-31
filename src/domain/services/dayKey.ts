/**
 * DayKey Utilities
 *
 * All per-day logic uses dayKey (yyyy-MM-dd string in household timezone).
 * This prevents DST and timezone bugs.
 */

/**
 * A dayKey is a date string in yyyy-MM-dd format.
 * All date comparisons for tasks, challenges, etc. should use dayKeys.
 */
export type DayKey = string;

/**
 * Get the current dayKey in a specific timezone.
 */
export function getTodayDayKey(timezone: string): DayKey {
  return formatDateToDayKey(new Date(), timezone);
}

/**
 * Format a Date to a dayKey in a specific timezone.
 */
export function formatDateToDayKey(date: Date, timezone: string): DayKey {
  // Use Intl.DateTimeFormat to get date parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // en-CA locale gives us yyyy-MM-dd format
  return formatter.format(date);
}

/**
 * Parse a dayKey to a Date object (at noon UTC to avoid timezone issues).
 */
export function parseDayKey(dayKey: DayKey): Date {
  return new Date(dayKey + 'T12:00:00Z');
}

/**
 * Get the day of week (0=Sunday, 6=Saturday) for a dayKey.
 */
export function getDayOfWeek(dayKey: DayKey): number {
  const date = parseDayKey(dayKey);
  return date.getUTCDay();
}

/**
 * Add days to a dayKey.
 */
export function addDays(dayKey: DayKey, days: number): DayKey {
  const date = parseDayKey(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Get the difference in days between two dayKeys.
 */
export function daysBetween(startDayKey: DayKey, endDayKey: DayKey): number {
  const start = parseDayKey(startDayKey);
  const end = parseDayKey(endDayKey);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if dayKey is within a range (inclusive).
 */
export function isDayKeyInRange(
  dayKey: DayKey,
  startDayKey: DayKey,
  endDayKey: DayKey
): boolean {
  return dayKey >= startDayKey && dayKey <= endDayKey;
}

/**
 * Generate an array of dayKeys for a range (inclusive).
 */
export function getDayKeysInRange(
  startDayKey: DayKey,
  endDayKey: DayKey
): DayKey[] {
  const dayKeys: DayKey[] = [];
  let current = startDayKey;

  while (current <= endDayKey) {
    dayKeys.push(current);
    current = addDays(current, 1);
  }

  return dayKeys;
}

/**
 * Get single-letter day label from dayKey (S, M, T, W, T, F, S).
 */
export function getDayLabel(dayKey: DayKey): string {
  const dayOfWeek = getDayOfWeek(dayKey);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return labels[dayOfWeek];
}

/**
 * Format a dayKey range for display (e.g., "Jan 24 - Jan 30").
 */
export function formatDayKeyRange(
  startDayKey: DayKey,
  endDayKey: DayKey
): string {
  const start = parseDayKey(startDayKey);
  const end = parseDayKey(endDayKey);

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/** Single-letter labels for each day of week (0=Sunday, 6=Saturday) */
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * Get single-letter label for a day of week number.
 */
export function getDayOfWeekLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek];
}

/**
 * Format an array of repeat days for display.
 * E.g., [1, 2, 3, 4, 5] → "M, T, W, T, F"
 * E.g., [0, 1, 2, 3, 4, 5, 6] → "Daily"
 * E.g., [0, 6] → "Weekends"
 * 
 * @param days - Array of day numbers (0=Sunday, 6=Saturday)
 * @param weekStartDay - Day the week starts (0=Sunday, 1=Monday) for ordering
 * @returns Formatted string for display
 */
export function formatRepeatDays(
  days: number[],
  weekStartDay: number = 0
): string {
  if (days.length === 0) {
    return 'Does not repeat';
  }

  if (days.length === 7) {
    return 'Daily';
  }

  // Check for weekends (Saturday and Sunday only)
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) {
    return 'Weekends';
  }

  // Check for weekdays (Monday through Friday only)
  if (
    sorted.length === 5 &&
    sorted[0] === 1 &&
    sorted[1] === 2 &&
    sorted[2] === 3 &&
    sorted[3] === 4 &&
    sorted[4] === 5
  ) {
    return 'Weekdays';
  }

  // Order days starting from weekStartDay
  const orderedDays = getOrderedDays(weekStartDay);
  const orderedSelected = orderedDays.filter((d) => days.includes(d));

  return orderedSelected.map((d) => DAY_LABELS[d]).join(', ');
}

/**
 * Get days of week in order starting from weekStartDay.
 * @param weekStartDay - 0 for Sunday through 6 for Saturday
 * @returns Array of day numbers in display order
 */
export function getOrderedDays(weekStartDay: number): number[] {
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    days.push((weekStartDay + i) % 7);
  }
  return days;
}
