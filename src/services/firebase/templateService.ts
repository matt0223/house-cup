/**
 * Firestore service for RecurringTemplate documents (JS SDK)
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
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
import { RecurringTemplate } from '../../domain/models/RecurringTemplate';

const SUBCOLLECTION = 'templates';

/**
 * Get a reference to the templates subcollection
 */
function getTemplatesRef(
  householdId: string
): CollectionReference | null {
  const db = getDb();
  if (!db) return null;
  return collection(db, 'households', householdId, SUBCOLLECTION);
}

/**
 * Get a reference to a specific template document
 */
function getTemplateRef(
  householdId: string,
  templateId: string
): DocumentReference | null {
  const db = getDb();
  if (!db) return null;
  return doc(db, 'households', householdId, SUBCOLLECTION, templateId);
}

/**
 * Convert Firestore document to RecurringTemplate
 */
function docToTemplate(
  docSnap: DocumentSnapshot
): RecurringTemplate | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  if (!data) return null;

  return {
    id: docSnap.id,
    householdId: data.householdId,
    name: data.name,
    repeatDays: data.repeatDays ?? [],
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
  };
}

/**
 * Get all templates for a household
 */
export async function getTemplates(
  householdId: string
): Promise<RecurringTemplate[]> {
  const ref = getTemplatesRef(householdId);
  if (!ref) return [];

  const snapshot = await getDocs(ref);

  return snapshot.docs
    .map(docToTemplate)
    .filter((t): t is RecurringTemplate => t !== null);
}

/**
 * Get a template by ID
 */
export async function getTemplate(
  householdId: string,
  templateId: string
): Promise<RecurringTemplate | null> {
  const ref = getTemplateRef(householdId, templateId);
  if (!ref) return null;

  const docSnap = await getDoc(ref);
  return docToTemplate(docSnap);
}

/**
 * Create a new template
 */
export async function createTemplate(
  householdId: string,
  template: Pick<RecurringTemplate, 'name' | 'repeatDays'>,
  templateId?: string
): Promise<RecurringTemplate> {
  const ref = getTemplatesRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }

  // Use provided ID or generate a new one
  const newDocRef = templateId ? doc(ref, templateId) : doc(ref);
  const now = serverTimestamp();

  const data = {
    householdId,
    name: template.name,
    repeatDays: template.repeatDays,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDocRef, data);

  const nowIso = new Date().toISOString();
  return {
    id: newDocRef.id,
    householdId,
    name: template.name,
    repeatDays: template.repeatDays,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Update a template
 */
export async function updateTemplate(
  householdId: string,
  templateId: string,
  updates: Partial<Pick<RecurringTemplate, 'name' | 'repeatDays'>>
): Promise<void> {
  const ref = getTemplateRef(householdId, templateId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  householdId: string,
  templateId: string
): Promise<void> {
  const ref = getTemplateRef(householdId, templateId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await deleteDoc(ref);
}

const BATCH_LIMIT = 500;

/**
 * Delete all templates for a household (e.g. when resetting / clearing data).
 */
export async function deleteAllTemplates(householdId: string): Promise<void> {
  const db = getDb();
  const ref = getTemplatesRef(householdId);
  if (!db || !ref) {
    throw new Error('Firestore is not configured');
  }

  const snapshot = await getDocs(ref);
  if (snapshot.empty) return;

  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const chunk = snapshot.docs.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const docSnap of chunk) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
}

/**
 * Subscribe to templates for a household
 */
export function subscribeToTemplates(
  householdId: string,
  onData: (templates: RecurringTemplate[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = getTemplatesRef(householdId);
  if (!ref) {
    return () => {};
  }

  return onSnapshot(
    ref,
    (snapshot) => {
      const templates = snapshot.docs
        .map(docToTemplate)
        .filter((t): t is RecurringTemplate => t !== null);
      onData(templates);
    },
    (error) => {
      console.error('Templates subscription error:', error);
      onError?.(error);
    }
  );
}
