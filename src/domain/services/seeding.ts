/**
 * Seeding Service
 *
 * Seeds TaskInstances from RecurringTemplates.
 * Idempotent: calling multiple times produces no duplicates.
 */

import { TaskInstance, hasLocalEdits } from '../models/TaskInstance';
import { RecurringTemplate, shouldRepeatOnDay } from '../models/RecurringTemplate';
import { SkipRecord, hasSkipRecord } from '../models/SkipRecord';
import { DayKey, getDayOfWeek } from './dayKey';

/**
 * Generate a unique ID for new entities.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Result of a seeding operation.
 */
export interface SeedResult {
  /** New task instances created */
  created: TaskInstance[];
  /** Existing instances that were skipped (already exist) */
  skipped: number;
}

/**
 * Seed tasks from templates for a given set of days.
 *
 * Rules:
 * - For each day in dayKeys:
 *   - For each template that repeats on that weekday:
 *     - If TaskInstance(templateId, dayKey) exists → skip
 *     - If SkipRecord(templateId, dayKey) exists → skip
 *     - Else → create TaskInstance
 *
 * This is idempotent: calling multiple times is safe.
 *
 * @param dayKeys - Days to seed (usually the challenge window)
 * @param templates - All recurring templates for the household
 * @param existingInstances - Existing task instances
 * @param skipRecords - Existing skip records
 * @param challengeId - ID of the current challenge
 * @returns SeedResult with created instances
 */
export function seedTasks(
  dayKeys: DayKey[],
  templates: RecurringTemplate[],
  existingInstances: TaskInstance[],
  skipRecords: SkipRecord[],
  challengeId: string
): SeedResult {
  const created: TaskInstance[] = [];
  let skipped = 0;

  // Build a lookup set for existing instances: "templateId:dayKey"
  const existingLookup = new Set<string>();
  for (const instance of existingInstances) {
    if (instance.templateId) {
      existingLookup.add(`${instance.templateId}:${instance.dayKey}`);
    }
  }

  // Track max sortOrder per day so seeded tasks append after existing ones
  const maxSortOrderByDay = new Map<DayKey, number>();
  for (const instance of existingInstances) {
    const cur = maxSortOrderByDay.get(instance.dayKey) ?? -1;
    maxSortOrderByDay.set(instance.dayKey, Math.max(cur, instance.sortOrder ?? 0));
  }

  const now = new Date().toISOString();

  for (const dayKey of dayKeys) {
    const dayOfWeek = getDayOfWeek(dayKey);

    for (const template of templates) {
      // Check if template repeats on this day
      if (!shouldRepeatOnDay(template, dayOfWeek)) {
        continue;
      }

      const lookupKey = `${template.id}:${dayKey}`;

      // Check if instance already exists
      if (existingLookup.has(lookupKey)) {
        skipped++;
        continue;
      }

      // Check if skip record exists
      if (hasSkipRecord(skipRecords, template.id, dayKey)) {
        skipped++;
        continue;
      }

      // Assign sortOrder: next value after existing tasks for this day
      const nextSort = (maxSortOrderByDay.get(dayKey) ?? -1) + 1;
      maxSortOrderByDay.set(dayKey, nextSort);

      // Create new instance
      const instance: TaskInstance = {
        id: generateId(),
        challengeId,
        dayKey,
        name: template.name,
        templateId: template.id,
        originalName: template.name, // For rename detection
        points: {},
        createdAt: now,
        updatedAt: now,
        sortOrder: nextSort,
      };

      created.push(instance);
      existingLookup.add(lookupKey); // Prevent duplicates within same seed call
    }
  }

  return { created, skipped };
}

/**
 * Result of a reconciliation operation.
 */
export interface ReconcileResult {
  /** Instances that were removed (untouched, out of pattern) */
  removed: TaskInstance[];
  /** Instances that were detached (had local edits, out of pattern) */
  detached: TaskInstance[];
  /** Skip records created for detached instances */
  newSkipRecords: SkipRecord[];
}

/**
 * Reconcile existing instances after template repeat days change.
 *
 * For future use: when the app wants "change repeat days → auto-remove/detach
 * out-of-pattern instances", call this with the template, old/new repeat days,
 * and all instances for that template, then apply the result (remove tasks,
 * update detached tasks, add skip records, persist).
 *
 * For instances that are now out of pattern:
 * - If untouched (0 points, not renamed) → remove
 * - If has local edits → detach (templateId = null) + create SkipRecord
 *
 * @param template - The template that was changed
 * @param oldRepeatDays - Previous repeat days
 * @param newRepeatDays - New repeat days
 * @param instances - All instances for this template
 * @returns ReconcileResult with changes to apply
 */
export function reconcileTemplateChange(
  template: RecurringTemplate,
  oldRepeatDays: number[],
  newRepeatDays: number[],
  instances: TaskInstance[]
): ReconcileResult {
  const removed: TaskInstance[] = [];
  const detached: TaskInstance[] = [];
  const newSkipRecords: SkipRecord[] = [];

  // Find days that were removed from the pattern
  const removedDays = new Set(
    oldRepeatDays.filter((d) => !newRepeatDays.includes(d))
  );

  if (removedDays.size === 0) {
    // No days removed, nothing to reconcile
    return { removed, detached, newSkipRecords };
  }

  for (const instance of instances) {
    // Only process instances that belong to this template
    if (instance.templateId !== template.id) {
      continue;
    }

    const dayOfWeek = getDayOfWeek(instance.dayKey);

    // Check if this instance's day was removed from the pattern
    if (!removedDays.has(dayOfWeek)) {
      continue;
    }

    // Instance is now out of pattern
    if (hasLocalEdits(instance)) {
      // Has points or was renamed → detach
      detached.push({
        ...instance,
        templateId: null,
        updatedAt: new Date().toISOString(),
      });
      newSkipRecords.push({
        templateId: template.id,
        dayKey: instance.dayKey,
      });
    } else {
      // Untouched → remove
      removed.push(instance);
    }
  }

  return { removed, detached, newSkipRecords };
}

/**
 * Detach an instance from its template.
 * Used for "edit this day only" operations.
 *
 * @param instance - The instance to detach
 * @returns [detached instance, new skip record]
 */
export function detachInstance(
  instance: TaskInstance
): [TaskInstance, SkipRecord | null] {
  if (!instance.templateId) {
    // Already detached or one-off
    return [instance, null];
  }

  const detached: TaskInstance = {
    ...instance,
    templateId: null,
    updatedAt: new Date().toISOString(),
  };

  const skipRecord: SkipRecord = {
    templateId: instance.templateId,
    dayKey: instance.dayKey,
  };

  return [detached, skipRecord];
}

/**
 * Create a skip record for a deleted template instance.
 * Used for "delete this day only" operations.
 */
export function createSkipRecordForDelete(
  instance: TaskInstance
): SkipRecord | null {
  if (!instance.templateId) {
    // One-off task, no skip record needed
    return null;
  }

  return {
    templateId: instance.templateId,
    dayKey: instance.dayKey,
  };
}
