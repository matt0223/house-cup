/**
 * Represents a task instance for a specific day.
 * Can be either a one-off task or seeded from a recurring template.
 */
export interface TaskInstance {
  /** Unique identifier */
  id: string;

  /** Challenge this task belongs to */
  challengeId: string;

  /** Date of this task (dayKey format: yyyy-MM-dd) */
  dayKey: string;

  /** Task name */
  name: string;

  /**
   * ID of the recurring template this was seeded from.
   * null = one-off task or detached from template.
   */
  templateId: string | null;

  /**
   * Original name when seeded from template.
   * Used for rename detection.
   * undefined for one-off tasks.
   */
  originalName?: string;

  /**
   * Points logged by each competitor.
   * Key = competitor ID, Value = 0-3
   */
  points: Record<string, number>;

  /** When the task was created */
  createdAt: string;

  /** When the task was last updated */
  updatedAt: string;

  /** Position in the task list for user-defined ordering. Lower = higher in list. */
  sortOrder?: number;
}

/**
 * Check if a task instance was renamed from its original template name.
 */
export function wasRenamed(instance: TaskInstance): boolean {
  if (instance.templateId === null) return false;
  if (instance.originalName === undefined) return false;
  return instance.name !== instance.originalName;
}

/**
 * Check if a task instance has any points logged.
 */
export function hasPoints(instance: TaskInstance): boolean {
  return Object.values(instance.points).some((p) => p > 0);
}

/**
 * Check if a task instance has local edits (points > 0 OR renamed).
 * Used for reconciliation decisions.
 */
export function hasLocalEdits(instance: TaskInstance): boolean {
  return hasPoints(instance) || wasRenamed(instance);
}

/**
 * Get total points for a specific competitor on a task.
 */
export function getPointsForCompetitor(
  instance: TaskInstance,
  competitorId: string
): number {
  return instance.points[competitorId] ?? 0;
}
