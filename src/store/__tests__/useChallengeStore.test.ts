/**
 * Tests for useChallengeStore — focused on the state management logic
 * that caused bugs in production (challenge ID corruption, duplicate tasks,
 * sortOrder assignment).
 *
 * These tests call store actions directly and assert on resulting state.
 * Firebase services are mocked to prevent real network calls.
 */

import { useChallengeStore } from '../useChallengeStore';
import { Challenge } from '../../domain/models/Challenge';
import { TaskInstance } from '../../domain/models/TaskInstance';
import { RecurringTemplate } from '../../domain/models/RecurringTemplate';

// Mock Firebase services (store imports them for Firestore persistence)
jest.mock('../../services/firebase/taskService', () => ({
  createTask: jest.fn().mockResolvedValue({}),
  updateTask: jest.fn().mockResolvedValue(undefined),
  updateTaskPoints: jest.fn().mockResolvedValue(undefined),
  deleteTask: jest.fn().mockResolvedValue(undefined),
  deleteTasksByTemplateFromDay: jest.fn().mockResolvedValue([]),
  updateTaskSortOrders: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/firebase/challengeService', () => ({
  updateChallenge: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/firebase/skipRecordService', () => ({
  addSkipRecord: jest.fn().mockResolvedValue(undefined),
  addSkipRecordsBatch: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/firebase/firebaseConfig', () => ({
  generateFirestoreId: () => `firestore-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  getDb: () => null,
}));

// ---------- helpers ----------

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'challenge-abc',
    householdId: 'household-1',
    startDayKey: '2026-02-08',
    endDayKey: '2026-02-14',
    prize: 'Winner picks dinner',
    winnerId: null,
    isTie: false,
    isCompleted: false,
    createdAt: '2026-02-08T00:00:00Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskInstance> = {}): TaskInstance {
  return {
    id: `task-${Math.random().toString(36).substr(2, 6)}`,
    challengeId: 'challenge-abc',
    dayKey: '2026-02-12',
    name: 'Test task',
    templateId: null,
    points: {},
    createdAt: '2026-02-12T10:00:00Z',
    updatedAt: '2026-02-12T10:00:00Z',
    ...overrides,
  };
}

function resetStore() {
  useChallengeStore.getState().reset();
}

// ---------- tests ----------

beforeEach(() => {
  resetStore();
});

describe('setChallenge', () => {
  it('first load: sets challenge, preserves empty tasks, resets tasksLoadedForChallengeId', () => {
    const challenge = makeChallenge();
    useChallengeStore.getState().setChallenge(challenge);

    const state = useChallengeStore.getState();
    expect(state.challenge).toEqual(challenge);
    expect(state.tasks).toEqual([]);
    expect(state.tasksLoadedForChallengeId).toBeNull();
  });

  it('same challenge ID: preserves tasks and tasksLoadedForChallengeId', () => {
    const challenge = makeChallenge();
    const tasks = [makeTask(), makeTask({ name: 'Task 2' })];

    // Simulate: challenge loaded, then tasks loaded
    useChallengeStore.getState().setChallenge(challenge);
    useChallengeStore.getState().setTasks(tasks);

    // Verify tasks and flag are set
    expect(useChallengeStore.getState().tasks).toHaveLength(2);
    expect(useChallengeStore.getState().tasksLoadedForChallengeId).toBe('challenge-abc');

    // Now deliver the same challenge again (e.g., prize update)
    const updatedChallenge = makeChallenge({ prize: 'New prize' });
    useChallengeStore.getState().setChallenge(updatedChallenge);

    const state = useChallengeStore.getState();
    expect(state.challenge?.prize).toBe('New prize');
    expect(state.tasks).toHaveLength(2); // preserved
    expect(state.tasksLoadedForChallengeId).toBe('challenge-abc'); // preserved
  });

  it('different challenge ID: clears tasks and resets flag', () => {
    const challengeA = makeChallenge({ id: 'challenge-A' });
    const tasks = [makeTask({ challengeId: 'challenge-A' })];

    useChallengeStore.getState().setChallenge(challengeA);
    useChallengeStore.getState().setTasks(tasks);

    // Switch to a different challenge
    const challengeB = makeChallenge({ id: 'challenge-B', startDayKey: '2026-02-15', endDayKey: '2026-02-21' });
    useChallengeStore.getState().setChallenge(challengeB);

    const state = useChallengeStore.getState();
    expect(state.challenge?.id).toBe('challenge-B');
    expect(state.tasks).toEqual([]); // cleared
    expect(state.tasksLoadedForChallengeId).toBeNull(); // reset
  });

  it('clearing (null): clears tasks and flag', () => {
    const challenge = makeChallenge();
    const tasks = [makeTask()];

    useChallengeStore.getState().setChallenge(challenge);
    useChallengeStore.getState().setTasks(tasks);

    useChallengeStore.getState().setChallenge(null);

    const state = useChallengeStore.getState();
    expect(state.challenge).toBeNull();
    expect(state.tasks).toEqual([]);
    expect(state.tasksLoadedForChallengeId).toBeNull();
  });
});

describe('setTasks', () => {
  it('sets tasksLoadedForChallengeId to current challenge ID', () => {
    const challenge = makeChallenge({ id: 'chal-123' });
    useChallengeStore.getState().setChallenge(challenge);

    const tasks = [makeTask({ challengeId: 'chal-123' })];
    useChallengeStore.getState().setTasks(tasks);

    const state = useChallengeStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasksLoadedForChallengeId).toBe('chal-123');
  });

  it('sets flag to null when no challenge is set', () => {
    // No challenge set (initial state)
    useChallengeStore.getState().setTasks([makeTask()]);

    expect(useChallengeStore.getState().tasksLoadedForChallengeId).toBeNull();
  });
});

describe('addTask — sortOrder', () => {
  beforeEach(() => {
    // Set up a challenge so addTask works
    const challenge = makeChallenge();
    useChallengeStore.getState().setChallenge(challenge);
    useChallengeStore.getState().setSelectedDay('2026-02-12');
  });

  it('first task on a day gets sortOrder 0', () => {
    useChallengeStore.getState().addTask('Task A', {});

    const tasks = useChallengeStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].sortOrder).toBe(0);
  });

  it('second task on the same day gets sortOrder 1', () => {
    useChallengeStore.getState().addTask('Task A', {});
    useChallengeStore.getState().addTask('Task B', {});

    const tasks = useChallengeStore.getState().tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks[0].sortOrder).toBe(0);
    expect(tasks[1].sortOrder).toBe(1);
  });

  it('tasks on different days get independent sortOrder sequences', () => {
    useChallengeStore.getState().setSelectedDay('2026-02-12');
    useChallengeStore.getState().addTask('Wed Task 1', {});
    useChallengeStore.getState().addTask('Wed Task 2', {});

    useChallengeStore.getState().setSelectedDay('2026-02-13');
    useChallengeStore.getState().addTask('Thu Task 1', {});

    const tasks = useChallengeStore.getState().tasks;
    const wedTasks = tasks.filter((t) => t.dayKey === '2026-02-12');
    const thuTasks = tasks.filter((t) => t.dayKey === '2026-02-13');

    expect(wedTasks[0].sortOrder).toBe(0);
    expect(wedTasks[1].sortOrder).toBe(1);
    expect(thuTasks[0].sortOrder).toBe(0); // independent sequence
  });

  it('appends after existing tasks without sortOrder (legacy)', () => {
    // Pre-populate with a legacy task that has no sortOrder
    const legacyTask = makeTask({ name: 'Legacy', sortOrder: undefined });
    useChallengeStore.setState({ tasks: [legacyTask] });

    useChallengeStore.getState().addTask('New task', {});

    const tasks = useChallengeStore.getState().tasks;
    const newTask = tasks.find((t) => t.name === 'New task');
    // Legacy task has sortOrder undefined, treated as 0 in max calculation → new gets 1
    expect(newTask?.sortOrder).toBe(1);
  });
});

describe('seedFromTemplates — duplicate prevention', () => {
  const dailyTemplate: RecurringTemplate = {
    id: 'template-daily',
    householdId: 'household-1',
    name: 'Exercise',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    const challenge = makeChallenge();
    useChallengeStore.getState().setChallenge(challenge);
  });

  it('does not duplicate when task already linked to template for a day', () => {
    // A task already exists with templateId set for Wednesday
    const linkedTask = makeTask({
      dayKey: '2026-02-11', // Wednesday within challenge window
      templateId: 'template-daily',
      name: 'Exercise',
    });
    useChallengeStore.setState({ tasks: [linkedTask] });

    useChallengeStore.getState().seedFromTemplates([dailyTemplate]);

    const state = useChallengeStore.getState();
    // Should have 1 existing + 6 seeded (one per other day), NOT 1 + 7
    const exerciseTasks = state.tasks.filter((t) => t.name === 'Exercise');
    const wednesdayTasks = exerciseTasks.filter((t) => t.dayKey === '2026-02-11');
    expect(wednesdayTasks).toHaveLength(1); // no duplicate
  });

  it('seedSkipAnchor prevents duplicate for that slot', () => {
    // Simulate: task exists but templateId not yet set (race condition scenario)
    const unlinkedTask = makeTask({
      dayKey: '2026-02-12',
      templateId: null, // not yet linked
      name: 'Exercise',
    });
    useChallengeStore.setState({
      tasks: [unlinkedTask],
      seedSkipAnchor: { templateId: 'template-daily', dayKey: '2026-02-12' },
    });

    useChallengeStore.getState().seedFromTemplates([dailyTemplate]);

    const state = useChallengeStore.getState();
    const feb12Tasks = state.tasks.filter(
      (t) => t.dayKey === '2026-02-12' && (t.templateId === 'template-daily' || t.name === 'Exercise')
    );
    // Should be 1 (the original unlinked task) + 0 seeded (anchor prevented it)
    // The unlinked task doesn't match templateId lookup, but the anchor does
    expect(feb12Tasks).toHaveLength(1);
  });

  it('seedSkipAnchor is one-shot: cleared after first seed call', () => {
    useChallengeStore.setState({
      seedSkipAnchor: { templateId: 'template-daily', dayKey: '2026-02-12' },
    });

    // First seed — anchor is used (skips 2026-02-12) and then cleared
    useChallengeStore.getState().seedFromTemplates([dailyTemplate]);
    expect(useChallengeStore.getState().seedSkipAnchor).toBeNull();

    // The skipped day (2026-02-12) should not have been seeded
    const feb12After1st = useChallengeStore.getState().tasks.filter(
      (t) => t.dayKey === '2026-02-12' && t.templateId === 'template-daily'
    );
    expect(feb12After1st).toHaveLength(0);

    // Second seed — anchor is gone, so 2026-02-12 is now filled
    useChallengeStore.getState().seedFromTemplates([dailyTemplate]);
    const feb12After2nd = useChallengeStore.getState().tasks.filter(
      (t) => t.dayKey === '2026-02-12' && t.templateId === 'template-daily'
    );
    expect(feb12After2nd).toHaveLength(1);

    // Third seed — fully idempotent, no new tasks
    const countBefore = useChallengeStore.getState().tasks.length;
    useChallengeStore.getState().seedFromTemplates([dailyTemplate]);
    expect(useChallengeStore.getState().tasks.length).toBe(countBefore);
  });
});
