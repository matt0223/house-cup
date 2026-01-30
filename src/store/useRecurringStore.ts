import { create } from 'zustand';
import { RecurringTemplate } from '../domain/models/RecurringTemplate';
import { SkipRecord } from '../domain/models/SkipRecord';

/**
 * Recurring store state
 */
interface RecurringState {
  /** All recurring templates */
  templates: RecurringTemplate[];

  /** Global skip records (persisted across challenges) */
  skipRecords: SkipRecord[];

  /** Whether data is loading */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;
}

/**
 * Recurring store actions
 */
interface RecurringActions {
  /** Add a new recurring template */
  addTemplate: (name: string, repeatDays: number[]) => RecurringTemplate;

  /** Update a template */
  updateTemplate: (
    templateId: string,
    updates: { name?: string; repeatDays?: number[] }
  ) => void;

  /** Delete a template */
  deleteTemplate: (templateId: string) => void;

  /** Add a skip record */
  addSkipRecord: (skipRecord: SkipRecord) => void;

  /** Add multiple skip records */
  addSkipRecords: (skipRecords: SkipRecord[]) => void;

  /** Remove skip records for a template */
  removeSkipRecordsForTemplate: (templateId: string) => void;

  /** Check if a skip record exists */
  hasSkipRecord: (templateId: string, dayKey: string) => boolean;

  /** Load sample data for development */
  loadSampleData: () => void;

  /** Clear all data */
  reset: () => void;
}

type RecurringStore = RecurringState & RecurringActions;

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Zustand store for recurring templates and skip records.
 */
export const useRecurringStore = create<RecurringStore>((set, get) => ({
  // Initial state
  templates: [],
  skipRecords: [],
  isLoading: false,
  error: null,

  // Actions
  addTemplate: (name, repeatDays) => {
    const now = new Date().toISOString();
    const template: RecurringTemplate = {
      id: generateId(),
      householdId: 'household-1', // Will come from household store
      name,
      repeatDays,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      templates: [...state.templates, template],
    }));

    return template;
  },

  updateTemplate: (templateId, updates) => {
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === templateId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      ),
    }));
  },

  deleteTemplate: (templateId) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
      // Keep skip records for historical data
    }));
  },

  addSkipRecord: (skipRecord) => {
    const { skipRecords } = get();
    // Check if already exists
    const exists = skipRecords.some(
      (sr) =>
        sr.templateId === skipRecord.templateId &&
        sr.dayKey === skipRecord.dayKey
    );

    if (!exists) {
      set({ skipRecords: [...skipRecords, skipRecord] });
    }
  },

  addSkipRecords: (newSkipRecords) => {
    const { skipRecords } = get();
    const uniqueNew = newSkipRecords.filter(
      (newSr) =>
        !skipRecords.some(
          (sr) =>
            sr.templateId === newSr.templateId && sr.dayKey === newSr.dayKey
        )
    );

    if (uniqueNew.length > 0) {
      set({ skipRecords: [...skipRecords, ...uniqueNew] });
    }
  },

  removeSkipRecordsForTemplate: (templateId) => {
    set((state) => ({
      skipRecords: state.skipRecords.filter(
        (sr) => sr.templateId !== templateId
      ),
    }));
  },

  hasSkipRecord: (templateId, dayKey) => {
    const { skipRecords } = get();
    return skipRecords.some(
      (sr) => sr.templateId === templateId && sr.dayKey === dayKey
    );
  },

  loadSampleData: () => {
    const now = new Date().toISOString();
    const sampleTemplates: RecurringTemplate[] = [
      {
        id: 'template-1',
        householdId: 'household-1',
        name: 'Exercise',
        repeatDays: [0, 1, 2, 3, 4, 5, 6], // Daily
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'template-2',
        householdId: 'household-1',
        name: 'Unload dishwasher',
        repeatDays: [0, 1, 2, 3, 4, 5, 6], // Daily
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'template-3',
        householdId: 'household-1',
        name: 'Dinner',
        repeatDays: [0, 1, 2, 3, 4, 5, 6], // Daily
        createdAt: now,
        updatedAt: now,
      },
    ];

    set({ templates: sampleTemplates, skipRecords: [] });
  },

  reset: () => {
    set({
      templates: [],
      skipRecords: [],
      error: null,
    });
  },
}));

// Selector hooks for common access patterns
export const useTemplates = () =>
  useRecurringStore((state) => state.templates);

export const useSkipRecords = () =>
  useRecurringStore((state) => state.skipRecords);
