/**
 * Firestore service for TaskInstance documents (JS SDK)
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebaseConfig';
import { TaskInstance } from '../../domain/models/TaskInstance';

const SUBCOLLECTION = 'tasks';

/**
 * Get a reference to the tasks subcollection
 */
function getTasksRef(
  householdId: string
): CollectionReference | null {
  const db = getDb();
  if (!db) return null;
  return collection(db, 'households', householdId, SUBCOLLECTION);
}

/**
 * Get a reference to a specific task document
 */
function getTaskRef(
  householdId: string,
  taskId: string
): DocumentReference | null {
  const db = getDb();
  if (!db) return null;
  return doc(db, 'households', householdId, SUBCOLLECTION, taskId);
}

/**
 * Convert Firestore document to TaskInstance
 */
function docToTask(
  docSnap: DocumentSnapshot
): TaskInstance | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  if (!data) return null;

  return {
    id: docSnap.id,
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
  const ref = getTasksRef(householdId);
  if (!ref) return [];

  const q = query(ref, where('challengeId', '==', challengeId));
  const snapshot = await getDocs(q);

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
  const ref = getTasksRef(householdId);
  if (!ref) return [];

  const q = query(
    ref,
    where('challengeId', '==', challengeId),
    where('dayKey', '==', dayKey)
  );
  const snapshot = await getDocs(q);

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
  const ref = getTasksRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }

  const newDocRef = doc(ref);
  const now = serverTimestamp();

  const data = {
    ...task,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDocRef, data);

  const nowIso = new Date().toISOString();
  return {
    ...task,
    id: newDocRef.id,
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

  const db = getDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }

  const batch = writeBatch(db);
  const now = serverTimestamp();
  const nowIso = new Date().toISOString();

  const results: TaskInstance[] = [];
  const ref = getTasksRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }

  for (const task of tasks) {
    const newDocRef = doc(ref);
    batch.set(newDocRef, {
      ...task,
      createdAt: now,
      updatedAt: now,
    });
    results.push({
      ...task,
      id: newDocRef.id,
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
  const ref = getTaskRef(householdId, taskId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
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
  const ref = getTaskRef(householdId, taskId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await updateDoc(ref, {
    [`points.${competitorId}`]: points,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a task
 */
export async function deleteTask(
  householdId: string,
  taskId: string
): Promise<void> {
  const ref = getTaskRef(householdId, taskId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await deleteDoc(ref);
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
  const db = getDb();
  const ref = getTasksRef(householdId);
  if (!db || !ref) {
    throw new Error('Firestore is not configured');
  }

  const q = query(
    ref,
    where('challengeId', '==', challengeId),
    where('templateId', '==', templateId),
    where('dayKey', '>=', fromDayKey)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return [];

  const batch = writeBatch(db);
  const deletedIds: string[] = [];

  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
    deletedIds.push(docSnap.id);
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
): Unsubscribe {
  const ref = getTasksRef(householdId);
  if (!ref) {
    return () => {};
  }

  const q = query(ref, where('challengeId', '==', challengeId));

  return onSnapshot(
    q,
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
