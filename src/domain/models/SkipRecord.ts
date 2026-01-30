/**
 * Represents a skip record that prevents a template from seeding on a specific day.
 * Created when user deletes or detaches a template-seeded task.
 */
export interface SkipRecord {
  /** ID of the recurring template */
  templateId: string;

  /** Date to skip (dayKey format: yyyy-MM-dd) */
  dayKey: string;
}

/**
 * Create a unique key for a skip record (for lookups).
 */
export function getSkipRecordKey(templateId: string, dayKey: string): string {
  return `${templateId}:${dayKey}`;
}

/**
 * Check if a skip record exists for a given template and day.
 */
export function hasSkipRecord(
  skipRecords: SkipRecord[],
  templateId: string,
  dayKey: string
): boolean {
  return skipRecords.some(
    (sr) => sr.templateId === templateId && sr.dayKey === dayKey
  );
}
