/**
 * Represents a recurring task template.
 * Tasks are seeded from templates based on repeat days.
 */
export interface RecurringTemplate {
  /** Unique identifier */
  id: string;

  /** Household this template belongs to */
  householdId: string;

  /** Task name */
  name: string;

  /**
   * Days of the week this task repeats.
   * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
   */
  repeatDays: number[];

  /** When the template was created */
  createdAt: string;

  /** When the template was last updated */
  updatedAt: string;
}

/**
 * Check if a template should appear on a given day of week.
 */
export function shouldRepeatOnDay(
  template: RecurringTemplate,
  dayOfWeek: number
): boolean {
  return template.repeatDays.includes(dayOfWeek);
}

/**
 * Get a human-readable description of repeat pattern.
 */
export function getRepeatDescription(template: RecurringTemplate): string {
  const days = template.repeatDays.sort();

  if (days.length === 0) return 'Does not repeat';
  if (days.length === 7) return 'Every day';

  // Check for weekdays (Mon-Fri = 1-5)
  if (
    days.length === 5 &&
    days.every((d) => d >= 1 && d <= 5)
  ) {
    return 'Weekdays';
  }

  // Check for weekends (Sat-Sun = 0, 6)
  if (
    days.length === 2 &&
    days.includes(0) &&
    days.includes(6)
  ) {
    return 'Weekends';
  }

  // List specific days
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map((d) => dayNames[d]).join(', ');
}
