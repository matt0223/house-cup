import { create } from 'zustand';
import { RecurringTemplate } from '../domain/models/RecurringTemplate';
import { SkipRecord } from '../domain/models/SkipRecord';
import * as templateService from '../services/firebase/templateService';
import * as skipRecordService from '../services/firebase/skipRecordService';

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

  /** Whether Firebase sync is enabled */
  syncEnabled: boolean;

  /** Current household ID for Firestore operations */
  householdId: string | null;
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

  /** Enable/disable Firebase sync */
  setSyncEnabled: (enabled: boolean, householdId: string | null) => void;
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
  syncEnabled: false,
  householdId: null,

  // Actions
  addTemplate: (name, repeatDays) => {
    const { syncEnabled, householdId } = get();
    const now = new Date().toISOString();
    const template: RecurringTemplate = {
      id: generateId(),
      householdId: householdId || 'household-1',
      name,
      repeatDays,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    set((state) => ({
      templates: [...state.templates, template],
    }));

    // Persist to Firestore
    if (syncEnabled && householdId) {
      templateService
        .createTemplate(householdId, { name, repeatDays })
        .then((createdTemplate) => {
          // Update with Firestore-generated ID
          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === template.id ? { ...t, id: createdTemplate.id } : t
            ),
          }));
        })
        .catch((error) => {
          console.error('Failed to sync template creation:', error);
          set({ error: `Sync failed: ${error.message}` });
        });
    }

    return template;
  },

  updateTemplate: (templateId, updates) => {
    const { syncEnabled, householdId } = get();

    // Optimistic update
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === templateId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      ),
    }));

    // Persist to Firestore
    if (syncEnabled && householdId) {
      templateService
        .updateTemplate(householdId, templateId, updates)
        .catch((error) => {
          console.error('Failed to sync template update:', error);
          set({ error: `Sync failed: ${error.message}` });
        });
    }
  },

  deleteTemplate: (templateId) => {
    const { syncEnabled, householdId } = get();

    // Optimistic update
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
      // Keep skip records for historical data
    }));

    // Persist to Firestore
    if (syncEnabled && householdId) {
      templateService
        .deleteTemplate(householdId, templateId)
        .catch((error) => {
          console.error('Failed to sync template deletion:', error);
          set({ error: `Sync failed: ${error.message}` });
        });
    }
  },

  addSkipRecord: (skipRecord) => {
    const { skipRecords, syncEnabled, householdId } = get();
    // Check if already exists
    const exists = skipRecords.some(
      (sr) =>
        sr.templateId === skipRecord.templateId &&
        sr.dayKey === skipRecord.dayKey
    );

    if (!exists) {
      // Optimistic update
      set({ skipRecords: [...skipRecords, skipRecord] });

      // Persist to Firestore
      if (syncEnabled && householdId) {
        skipRecordService
          .addSkipRecord(householdId, skipRecord)
          .catch((error) => {
            console.error('Failed to sync skip record:', error);
          });
      }
    }
  },

  addSkipRecords: (newSkipRecords) => {
    const { skipRecords, syncEnabled, householdId } = get();
    const uniqueNew = newSkipRecords.filter(
      (newSr) =>
        !skipRecords.some(
          (sr) =>
            sr.templateId === newSr.templateId && sr.dayKey === newSr.dayKey
        )
    );

    if (uniqueNew.length > 0) {
      // Optimistic update
      set({ skipRecords: [...skipRecords, ...uniqueNew] });

      // Persist to Firestore
      if (syncEnabled && householdId) {
        skipRecordService
          .addSkipRecordsBatch(householdId, uniqueNew)
          .catch((error) => {
            console.error('Failed to sync skip records:', error);
          });
      }
    }
  },

  removeSkipRecordsForTemplate: (templateId) => {
    const { syncEnabled, householdId } = get();

    // Optimistic update
    set((state) => ({
      skipRecords: state.skipRecords.filter(
        (sr) => sr.templateId !== templateId
      ),
    }));

    // Persist to Firestore
    if (syncEnabled && householdId) {
      skipRecordService
        .removeSkipRecordsForTemplate(householdId, templateId)
        .catch((error) => {
          console.error('Failed to sync skip records removal:', error);
        });
    }
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

  setSyncEnabled: (enabled, householdId) => {
    set({ syncEnabled: enabled, householdId });
  },
}));

// Selector hooks for common access patterns
export const useTemplates = () =>
  useRecurringStore((state) => state.templates);

export const useSkipRecords = () =>
  useRecurringStore((state) => state.skipRecords);
