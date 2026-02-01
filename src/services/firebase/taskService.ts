/**
 * Firestore service for TaskInstance documents
 */

import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { TaskInstance } from '../../domain/models/TaskInstance';

const SUBCOLLECTION = 'tasks';

/**
 * Get a reference to the tasks subcollection
 */
function getTasksRef(
  householdId: string
): FirebaseFirestoreTypes.CollectionReference {
  return firestore()
    .collection('households')
    .doc(householdId)
    .collection(SUBCOLLECTION);
}

/**
 * Get a reference to a specific task document
 */
function getTaskRef(
  householdId: string,
  taskId: string
): FirebaseFirestoreTypes.DocumentReference {
  return getTasksRef(householdId).doc(taskId);
}

/**
 * Convert Firestore document to TaskInstance
 */
function docToTask(
  doc: FirebaseFirestoreTypes.DocumentSnapshot
): TaskInstance | null {
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
    challengeId: data.challengeId,
    dayKey: data.dayKey,
    name: data.name,
    templateId: data.templateId ?? null,
    originalName: data.originalName,
    points: data.points ?? {},
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
  };
}

/**
 * Get all tasks for a challenge
 */
export async function getTasksForChallenge(
  householdId: string,
  challengeId: string
): Promise<TaskInstance[]> {
  const snapshot = await getTasksRef(householdId)
    .where('challengeId', '==', challengeId)
    .get();

  return snapshot.docs
    .map(docToTask)
    .filter((t): t is TaskInstance => t !== null);
}

/**
 * Get tasks for a specific day
 */
export async function getTasksForDay(
  householdId: string,
  challengeId: string,
  dayKey: string
): Promise<TaskInstance[]> {
  const snapshot = await getTasksRef(householdId)
    .where('challengeId', '==', challengeId)
    .where('dayKey', '==', dayKey)
    .get();

  return snapshot.docs
    .map(docToTask)
    .filter((t): t is TaskInstance => t !== null);
}

/**
 * Create a new task
 */
export async function createTask(
  householdId: string,
  task: Omit<TaskInstance, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TaskInstance> {
  const ref = getTasksRef(householdId).doc();
  const now = firestore.FieldValue.serverTimestamp();

  const data = {
    ...task,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(data);

  const nowIso = new Date().toISOString();
  return {
    ...task,
    id: ref.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Create multiple tasks in a batch
 */
export async function createTasksBatch(
  householdId: string,
  tasks: Omit<TaskInstance, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<TaskInstance[]> {
  if (tasks.length === 0) return [];

  const batch = firestore().batch();
  const now = firestore.FieldValue.serverTimestamp();
  const nowIso = new Date().toISOString();

  const results: TaskInstance[] = [];

  for (const task of tasks) {
    const ref = getTasksRef(householdId).doc();
    batch.set(ref, {
      ...task,
      createdAt: now,
      updatedAt: now,
    });
    results.push({
      ...task,
      id: ref.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  await batch.commit();
  return results;
}

/**
 * Update a task
 */
export async function updateTask(
  householdId: string,
  taskId: string,
  updates: Partial<Pick<TaskInstance, 'name' | 'points' | 'templateId' | 'originalName'>>
): Promise<void> {
  await getTaskRef(householdId, taskId).update({
    ...updates,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Update task points
 */
export async function updateTaskPoints(
  householdId: string,
  taskId: string,
  competitorId: string,
  points: number
): Promise<void> {
  await getTaskRef(householdId, taskId).update({
    [`points.${competitorId}`]: points,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Delete a task
 */
export async function deleteTask(
  householdId: string,
  taskId: string
): Promise<void> {
  await getTaskRef(householdId, taskId).delete();
}

/**
 * Delete multiple tasks by template ID from a specific day onwards
 */
export async function deleteTasksByTemplateFromDay(
  householdId: string,
  challengeId: string,
  templateId: string,
  fromDayKey: string
): Promise<string[]> {
  const snapshot = await getTasksRef(householdId)
    .where('challengeId', '==', challengeId)
    .where('templateId', '==', templateId)
    .where('dayKey', '>=', fromDayKey)
    .get();

  if (snapshot.empty) return [];

  const batch = firestore().batch();
  const deletedIds: string[] = [];

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    deletedIds.push(doc.id);
  }

  await batch.commit();
  return deletedIds;
}

/**
 * Subscribe to tasks for a challenge
 */
export function subscribeToTasks(
  householdId: string,
  challengeId: string,
  onData: (tasks: TaskInstance[]) => void,
  onError?: (error: Error) => void
): () => void {
  return getTasksRef(householdId)
    .where('challengeId', '==', challengeId)
    .onSnapshot(
      (snapshot) => {
        const tasks = snapshot.docs
          .map(docToTask)
          .filter((t): t is TaskInstance => t !== null);
        onData(tasks);
      },
      (error) => {
        console.error('Tasks subscription error:', error);
        onError?.(error);
      }
    );
}
