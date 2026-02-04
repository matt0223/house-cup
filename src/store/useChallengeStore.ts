import { create } from 'zustand';
import { Challenge, getChallengeDayKeys } from '../domain/models/Challenge';
import { TaskInstance, hasLocalEdits } from '../domain/models/TaskInstance';
import { RecurringTemplate } from '../domain/models/RecurringTemplate';
import { SkipRecord } from '../domain/models/SkipRecord';
import { WeekStartDay } from '../domain/models/Household';
import {
  DayKey,
  getTodayDayKey,
  getCurrentWeekWindow,
  seedTasks,
  detachInstance,
  createSkipRecordForDelete,
  calculateChallengeScores,
  ChallengeScores,
} from '../domain/services';
import { Competitor } from '../domain/models/Competitor';
import * as taskService from '../services/firebase/taskService';
import * as challengeService from '../services/firebase/challengeService';
import * as skipRecordService from '../services/firebase/skipRecordService';
import { generateFirestoreId } from '../services/firebase/firebaseConfig';

/**
 * Challenge store state
 */
interface ChallengeState {
  /** Current active challenge */
  challenge: Challenge | null;

  /** All task instances for the current challenge */
  tasks: TaskInstance[];

  /** Currently selected day in the UI */
  selectedDayKey: DayKey;

  /** Skip records for the current challenge */
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
 * Challenge store actions
 */
interface ChallengeActions {
  /** Initialize challenge for the current week */
  initializeChallenge: (
    timezone: string,
    weekStartDay: WeekStartDay,
    templates: RecurringTemplate[],
    existingSkipRecords: SkipRecord[]
  ) => void;

  /** Set the selected day */
  setSelectedDay: (dayKey: DayKey) => void;

  /** Add a new task, returns the task ID */
  addTask: (name: string, points: Record<string, number>, templateId?: string | null) => string;

  /** Update task name */
  updateTaskName: (
    taskId: string,
    name: string,
    applyToAll: boolean,
    templates: RecurringTemplate[],
    onTemplateUpdate?: (templateId: string, newName: string) => void
  ) => void;

  /** Update points for a task */
  updateTaskPoints: (
    taskId: string,
    competitorId: string,
    points: number
  ) => void;

  /** Delete a task */
  deleteTask: (taskId: string) => SkipRecord | null;

  /** Delete all tasks for a template from a given day onwards */
  deleteTasksForTemplateFromDay: (
    templateId: string,
    fromDayKey: DayKey
  ) => void;

  /** Link a one-off task to a template (for converting to recurring) */
  linkTaskToTemplate: (taskId: string, templateId: string) => void;

  /** Update task with full changes */
  updateTask: (
    taskId: string,
    changes: { name?: string; points?: Record<string, number>; templateId?: string | null }
  ) => void;

  /** Seed tasks from templates */
  seedFromTemplates: (templates: RecurringTemplate[]) => void;

  /** Calculate current scores */
  getScores: (competitors: Competitor[]) => ChallengeScores;

  /** Get tasks for a specific day */
  getTasksForDay: (dayKey: DayKey) => TaskInstance[];

  /** Update the prize */
  updatePrize: (prize: string) => void;

  /** Update challenge boundaries when weekStartDay changes (preserves tasks) */
  updateChallengeBoundaries: (timezone: string, weekStartDay: WeekStartDay) => void;

  /** Clear all data */
  reset: () => void;

  /** Enable/disable Firebase sync */
  setSyncEnabled: (enabled: boolean, householdId: string | null) => void;

  /** Set challenge (for Firestore sync) */
  setChallenge: (challenge: Challenge) => void;

  /** Set all tasks (for Firestore sync) */
  setTasks: (tasks: TaskInstance[]) => void;
}

type ChallengeStore = ChallengeState & ChallengeActions;

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Zustand store for challenge data.
 * Contains current challenge, tasks, and selected day.
 */
export const useChallengeStore = create<ChallengeStore>((set, get) => ({
  // Initial state
  challenge: null,
  tasks: [],
  selectedDayKey: new Date().toISOString().split('T')[0],
  skipRecords: [],
  isLoading: false,
  error: null,
  syncEnabled: false,
  householdId: null,

  // Actions
  initializeChallenge: (timezone, weekStartDay, templates, existingSkipRecords) => {
    const weekWindow = getCurrentWeekWindow(timezone, weekStartDay);
    const today = getTodayDayKey(timezone);

    // Create or get challenge
    const challenge: Challenge = {
      id: generateId(),
      householdId: 'household-1', // Will come from household store
      startDayKey: weekWindow.startDayKey,
      endDayKey: weekWindow.endDayKey,
      prize: 'Sleep-in weekend',
      winnerId: null,
      isTie: false,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    // Seed tasks from templates
    const seedResult = seedTasks(
      weekWindow.dayKeys,
      templates,
      [],
      existingSkipRecords,
      challenge.id
    );

    set({
      challenge,
      tasks: seedResult.created,
      selectedDayKey: today,
      skipRecords: existingSkipRecords,
      error: null,
    });
  },

  setSelectedDay: (dayKey) => {
    set({ selectedDayKey: dayKey });
  },

  addTask: (name, points, templateId = null) => {
    const { challenge, selectedDayKey, tasks, syncEnabled, householdId } = get();
    if (!challenge) return '';

    const now = new Date().toISOString();
    // Pre-generate Firestore-compatible ID so local and synced IDs match
    const taskId = syncEnabled ? generateFirestoreId() : generateId();
    
    const newTask: TaskInstance = {
      id: taskId,
      challengeId: challenge.id,
      dayKey: selectedDayKey,
      name,
      templateId, // Use passed templateId (null for one-off, set for recurring)
      originalName: templateId ? name : undefined, // Set originalName for recurring tasks
      points,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    set({ tasks: [...tasks, newTask] });

    // Persist to Firestore with the same ID
    if (syncEnabled && householdId) {
      taskService
        .createTask(
          householdId,
          {
            challengeId: challenge.id,
            dayKey: selectedDayKey,
            name,
            templateId,
            points,
          },
          taskId // Pass the pre-generated ID
        )
        .catch((error) => {
          console.error('Failed to sync task creation:', error);
          set({ error: `Sync failed: ${error.message}` });
        });
    }

    return taskId;
  },

  updateTaskName: (taskId, name, applyToAll, templates, onTemplateUpdate) => {
    const { tasks, skipRecords } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (applyToAll && task.templateId) {
      // Update template name and all linked instances
      const template = templates.find((t) => t.id === task.templateId);
      if (template && onTemplateUpdate) {
        onTemplateUpdate(template.id, name);
      }

      // Update all instances with this templateId
      const updatedTasks = tasks.map((t) =>
        t.templateId === task.templateId
          ? { ...t, name, updatedAt: new Date().toISOString() }
          : t
      );
      set({ tasks: updatedTasks });
    } else {
      // Detach and update just this instance
      const [detached, newSkipRecord] = detachInstance(task);
      const updatedTask = { ...detached, name, updatedAt: new Date().toISOString() };

      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? updatedTask : t
      );

      const updatedSkipRecords = newSkipRecord
        ? [...skipRecords, newSkipRecord]
        : skipRecords;

      set({ tasks: updatedTasks, skipRecords: updatedSkipRecords });
    }
  },

  updateTaskPoints: (taskId, competitorId, points) => {
    const { tasks, syncEnabled, householdId } = get();
    const clampedPoints = Math.max(0, Math.min(3, points));

    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            points: { ...t.points, [competitorId]: clampedPoints },
            updatedAt: new Date().toISOString(),
          }
        : t
    );

    // Optimistic update
    set({ tasks: updatedTasks });

    // Persist to Firestore
    if (syncEnabled && householdId) {
      taskService
        .updateTaskPoints(householdId, taskId, competitorId, clampedPoints)
        .catch((error) => {
          console.error('Failed to sync points update:', error);
          set({ error: `Sync failed: ${error.message}` });
        });
    }
  },

  deleteTask: (taskId) => {
    const { tasks, skipRecords, syncEnabled, householdId } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    // Create skip record if template-based
    const newSkipRecord = createSkipRecordForDelete(task);

    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    const updatedSkipRecords = newSkipRecord
      ? [...skipRecords, newSkipRecord]
      : skipRecords;

    // Optimistic update
    set({ tasks: updatedTasks, skipRecords: updatedSkipRecords });

    // Persist to Firestore
    if (syncEnabled && householdId) {
      // Delete task
      taskService.deleteTask(householdId, taskId).catch((error) => {
        console.error('Failed to sync task deletion:', error);
        set({ error: `Sync failed: ${error.message}` });
      });

      // Add skip record if needed
      if (newSkipRecord) {
        skipRecordService
          .addSkipRecord(householdId, newSkipRecord)
          .catch((error) => {
            console.error('Failed to sync skip record:', error);
          });
      }
    }

    return newSkipRecord;
  },

  deleteTasksForTemplateFromDay: (templateId, fromDayKey) => {
    const { tasks, skipRecords } = get();

    // Find tasks to delete (template matches and dayKey >= fromDayKey)
    const tasksToDelete = tasks.filter(
      (t) => t.templateId === templateId && t.dayKey >= fromDayKey
    );

    // Create skip records for each
    const newSkipRecords: SkipRecord[] = tasksToDelete
      .map((t) => createSkipRecordForDelete(t))
      .filter((sr): sr is SkipRecord => sr !== null);

    // Filter out deleted tasks
    const updatedTasks = tasks.filter(
      (t) => !(t.templateId === templateId && t.dayKey >= fromDayKey)
    );

    // Add new skip records, avoiding duplicates
    const existingKeys = new Set(
      skipRecords.map((sr) => `${sr.templateId}-${sr.dayKey}`)
    );
    const uniqueNewSkipRecords = newSkipRecords.filter(
      (sr) => !existingKeys.has(`${sr.templateId}-${sr.dayKey}`)
    );

    set({
      tasks: updatedTasks,
      skipRecords: [...skipRecords, ...uniqueNewSkipRecords],
    });
  },

  linkTaskToTemplate: (taskId, templateId) => {
    const { tasks } = get();

    const updatedTasks = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            templateId,
            originalName: t.name, // Set original name for rename detection
            updatedAt: new Date().toISOString(),
          }
        : t
    );

    set({ tasks: updatedTasks });
  },

  updateTask: (taskId, changes) => {
    const { tasks } = get();

    const updatedTasks = tasks.map((t) => {
      if (t.id !== taskId) return t;

      return {
        ...t,
        ...(changes.name !== undefined && { name: changes.name }),
        ...(changes.points !== undefined && { points: changes.points }),
        ...(changes.templateId !== undefined && { templateId: changes.templateId }),
        updatedAt: new Date().toISOString(),
      };
    });

    set({ tasks: updatedTasks });
  },

  seedFromTemplates: (templates) => {
    const { challenge, tasks, skipRecords } = get();
    if (!challenge) return;

    const dayKeys = getChallengeDayKeys(challenge);
    const seedResult = seedTasks(
      dayKeys,
      templates,
      tasks,
      skipRecords,
      challenge.id
    );

    if (seedResult.created.length > 0) {
      set({ tasks: [...tasks, ...seedResult.created] });
    }
  },

  getScores: (competitors) => {
    const { tasks } = get();
    return calculateChallengeScores(tasks, competitors);
  },

  getTasksForDay: (dayKey) => {
    const { tasks } = get();
    return tasks.filter((t) => t.dayKey === dayKey);
  },

  updatePrize: (prize) => {
    const { challenge } = get();
    if (!challenge) return;

    set({
      challenge: { ...challenge, prize },
    });
  },

  updateChallengeBoundaries: (timezone, weekStartDay) => {
    const { challenge, syncEnabled, householdId } = get();
    if (!challenge) return;

    // Calculate new week boundaries
    const weekWindow = getCurrentWeekWindow(timezone, weekStartDay);

    // Update challenge locally
    const updatedChallenge = {
      ...challenge,
      startDayKey: weekWindow.startDayKey,
      endDayKey: weekWindow.endDayKey,
    };

    set({ challenge: updatedChallenge });

    // Sync to Firebase if enabled
    if (syncEnabled && householdId) {
      challengeService
        .updateChallenge(householdId, challenge.id, {
          startDayKey: weekWindow.startDayKey,
          endDayKey: weekWindow.endDayKey,
        })
        .catch((error) => {
          console.error('Failed to sync challenge boundary update:', error);
          set({ error: `Sync failed: ${error.message}` });
        });
    }
  },

  reset: () => {
    set({
      challenge: null,
      tasks: [],
      selectedDayKey: new Date().toISOString().split('T')[0],
      skipRecords: [],
      error: null,
    });
  },

  setSyncEnabled: (enabled, householdId) => {
    set({ syncEnabled: enabled, householdId });
  },

  setChallenge: (challenge) => {
    set({ challenge });
  },

  setTasks: (tasks) => {
    set({ tasks });
  },
}));

// Selector hooks for common access patterns
export const useSelectedDayKey = () =>
  useChallengeStore((state) => state.selectedDayKey);

export const useCurrentChallenge = () =>
  useChallengeStore((state) => state.challenge);

export const useTasksForSelectedDay = () =>
  useChallengeStore((state) =>
    state.tasks.filter((t) => t.dayKey === state.selectedDayKey)
  );

export const useAllTasks = () =>
  useChallengeStore((state) => state.tasks);
