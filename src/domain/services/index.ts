/**
 * Domain Services
 *
 * Pure business logic functions. No React dependencies.
 */

// DayKey utilities
export {
  type DayKey,
  getTodayDayKey,
  formatDateToDayKey,
  parseDayKey,
  getDayOfWeek,
  addDays,
  daysBetween,
  isDayKeyInRange,
  getDayKeysInRange,
  getDayLabel,
  formatDayKeyRange,
} from './dayKey';

// Week window calculations
export {
  type WeekWindow,
  getCurrentWeekWindow,
  getWeekWindowContaining,
  getNextWeekWindow,
  getPreviousWeekWindow,
  isInCurrentWeek,
} from './weekWindow';

// Seeding logic
export {
  type SeedResult,
  type ReconcileResult,
  seedTasks,
  reconcileTemplateChange,
  detachInstance,
  createSkipRecordForDelete,
} from './seeding';

// Scoring calculations
export {
  type CompetitorScore,
  type ChallengeScores,
  calculateCompetitorTotal,
  calculateChallengeScores,
  calculateDailyScores,
  getMaxPossiblePoints,
  calculateDayCompletion,
} from './scoring';
