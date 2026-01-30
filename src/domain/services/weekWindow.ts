/**
 * Week Window Service
 *
 * Calculates challenge date boundaries based on household's
 * week start day and timezone.
 */

import { WeekStartDay } from '../models/Household';
import {
  DayKey,
  getTodayDayKey,
  getDayOfWeek,
  addDays,
  getDayKeysInRange,
} from './dayKey';

export interface WeekWindow {
  /** First day of the challenge week */
  startDayKey: DayKey;
  /** Last day of the challenge week */
  endDayKey: DayKey;
  /** All 7 days in the week */
  dayKeys: DayKey[];
}

/**
 * Get the current week's challenge window.
 *
 * @param timezone - Household timezone (IANA format)
 * @param weekStartDay - Day the week starts (0=Sunday, 1=Monday)
 * @returns The week window containing today
 */
export function getCurrentWeekWindow(
  timezone: string,
  weekStartDay: WeekStartDay
): WeekWindow {
  const today = getTodayDayKey(timezone);
  return getWeekWindowContaining(today, weekStartDay);
}

/**
 * Get the week window containing a specific dayKey.
 *
 * @param dayKey - Any day in the week
 * @param weekStartDay - Day the week starts (0=Sunday, 1=Monday)
 * @returns The week window containing the given day
 */
export function getWeekWindowContaining(
  dayKey: DayKey,
  weekStartDay: WeekStartDay
): WeekWindow {
  const dayOfWeek = getDayOfWeek(dayKey);

  // Calculate how many days back to the start of the week
  let daysBack = dayOfWeek - weekStartDay;
  if (daysBack < 0) {
    daysBack += 7;
  }

  const startDayKey = addDays(dayKey, -daysBack);
  const endDayKey = addDays(startDayKey, 6);

  return {
    startDayKey,
    endDayKey,
    dayKeys: getDayKeysInRange(startDayKey, endDayKey),
  };
}

/**
 * Get the next week's challenge window.
 *
 * @param timezone - Household timezone (IANA format)
 * @param weekStartDay - Day the week starts (0=Sunday, 1=Monday)
 * @returns The week window after the current one
 */
export function getNextWeekWindow(
  timezone: string,
  weekStartDay: WeekStartDay
): WeekWindow {
  const current = getCurrentWeekWindow(timezone, weekStartDay);
  const nextStart = addDays(current.endDayKey, 1);
  return getWeekWindowContaining(nextStart, weekStartDay);
}

/**
 * Get the previous week's challenge window.
 *
 * @param timezone - Household timezone (IANA format)
 * @param weekStartDay - Day the week starts (0=Sunday, 1=Monday)
 * @returns The week window before the current one
 */
export function getPreviousWeekWindow(
  timezone: string,
  weekStartDay: WeekStartDay
): WeekWindow {
  const current = getCurrentWeekWindow(timezone, weekStartDay);
  const prevEnd = addDays(current.startDayKey, -1);
  return getWeekWindowContaining(prevEnd, weekStartDay);
}

/**
 * Check if a dayKey is in the current challenge week.
 */
export function isInCurrentWeek(
  dayKey: DayKey,
  timezone: string,
  weekStartDay: WeekStartDay
): boolean {
  const current = getCurrentWeekWindow(timezone, weekStartDay);
  return dayKey >= current.startDayKey && dayKey <= current.endDayKey;
}
