import { create } from 'zustand';
import { Challenge, getChallengeDayKeys } from '../domain/models/Challenge';
import { TaskInstance, hasLocalEdits } from '../domain/models/TaskInstance';
import { RecurringTemplate } from '../domain/models/RecurringTemplate';
import { SkipRecord } from '../domain/models/SkipRecord';
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
}

/**
 * Challenge store actions
 */
interface ChallengeActions {
  /** Initialize challenge for the current week */
  initializeChallenge: (
    timezone: string,
    weekStartDay: 0 | 1,
    templates: RecurringTemplate[],
    existingSkipRecords: SkipRecord[]
  ) => void;

  /** Set the selected day */
  setSelectedDay: (dayKey: DayKey) => void;

  /** Add a new task (one-off) */
  addTask: (name: string, points: Record<string, number>) => void;

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

  /** Seed tasks from templates */
  seedFromTemplates: (templates: RecurringTemplate[]) => void;

  /** Calculate current scores */
  getScores: (competitors: Competitor[]) => ChallengeScores;

  /** Get tasks for a specific day */
  getTasksForDay: (dayKey: DayKey) => TaskInstance[];

  /** Update the prize */
  updatePrize: (prize: string) => void;

  /** Clear all data */
  reset: () => void;
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

  addTask: (name, points) => {
    const { challenge, selectedDayKey, tasks } = get();
    if (!challenge) return;

    const now = new Date().toISOString();
    const newTask: TaskInstance = {
      id: generateId(),
      challengeId: challenge.id,
      dayKey: selectedDayKey,
      name,
      templateId: null, // One-off task
      points,
      createdAt: now,
      updatedAt: now,
    };

    set({ tasks: [...tasks, newTask] });
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
    const { tasks } = get();
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

    set({ tasks: updatedTasks });
  },

  deleteTask: (taskId) => {
    const { tasks, skipRecords } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    // Create skip record if template-based
    const newSkipRecord = createSkipRecordForDelete(task);

    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    const updatedSkipRecords = newSkipRecord
      ? [...skipRecords, newSkipRecord]
      : skipRecords;

    set({ tasks: updatedTasks, skipRecords: updatedSkipRecords });

    return newSkipRecord;
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

  reset: () => {
    set({
      challenge: null,
      tasks: [],
      selectedDayKey: new Date().toISOString().split('T')[0],
      skipRecords: [],
      error: null,
    });
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
