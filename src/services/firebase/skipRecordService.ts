/**
 * Firestore service for SkipRecord documents (JS SDK)
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  writeBatch,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebaseConfig';
import { SkipRecord, getSkipRecordKey } from '../../domain/models/SkipRecord';

const SUBCOLLECTION = 'skipRecords';

/**
 * Get a reference to the skipRecords subcollection
 */
function getSkipRecordsRef(
  householdId: string
): CollectionReference | null {
  const db = getDb();
  if (!db) return null;
  return collection(db, 'households', householdId, SUBCOLLECTION);
}

/**
 * Get a reference to a specific skip record document
 * Uses templateId:dayKey as the document ID for easy deduplication
 */
function getSkipRecordRef(
  householdId: string,
  templateId: string,
  dayKey: string
): DocumentReference | null {
  const db = getDb();
  if (!db) return null;
  const docId = getSkipRecordKey(templateId, dayKey);
  return doc(db, 'households', householdId, SUBCOLLECTION, docId);
}

/**
 * Convert Firestore document to SkipRecord
 */
function docToSkipRecord(
  docSnap: DocumentSnapshot
): SkipRecord | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  if (!data) return null;

  return {
    templateId: data.templateId,
    dayKey: data.dayKey,
  };
}

/**
 * Get all skip records for a household
 */
export async function getSkipRecords(
  householdId: string
): Promise<SkipRecord[]> {
  const ref = getSkipRecordsRef(householdId);
  if (!ref) return [];

  const snapshot = await getDocs(ref);

  return snapshot.docs
    .map(docToSkipRecord)
    .filter((sr): sr is SkipRecord => sr !== null);
}

/**
 * Get skip records for a specific template
 */
export async function getSkipRecordsForTemplate(
  householdId: string,
  templateId: string
): Promise<SkipRecord[]> {
  const ref = getSkipRecordsRef(householdId);
  if (!ref) return [];

  const q = query(ref, where('templateId', '==', templateId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(docToSkipRecord)
    .filter((sr): sr is SkipRecord => sr !== null);
}

/**
 * Add a skip record (idempotent - uses set with merge)
 */
export async function addSkipRecord(
  householdId: string,
  skipRecord: SkipRecord
): Promise<void> {
  const ref = getSkipRecordRef(
    householdId,
    skipRecord.templateId,
    skipRecord.dayKey
  );
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await setDoc(ref, skipRecord);
}

/**
 * Add multiple skip records in a batch
 */
export async function addSkipRecordsBatch(
  householdId: string,
  skipRecords: SkipRecord[]
): Promise<void> {
  if (skipRecords.length === 0) return;

  const db = getDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }

  const batch = writeBatch(db);

  for (const sr of skipRecords) {
    const ref = getSkipRecordRef(householdId, sr.templateId, sr.dayKey);
    if (ref) {
      batch.set(ref, sr);
    }
  }

  await batch.commit();
}

/**
 * Remove a skip record
 */
export async function removeSkipRecord(
  householdId: string,
  templateId: string,
  dayKey: string
): Promise<void> {
  const ref = getSkipRecordRef(householdId, templateId, dayKey);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await deleteDoc(ref);
}

/**
 * Remove all skip records for a template
 */
export async function removeSkipRecordsForTemplate(
  householdId: string,
  templateId: string
): Promise<void> {
  const db = getDb();
  const ref = getSkipRecordsRef(householdId);
  if (!db || !ref) {
    throw new Error('Firestore is not configured');
  }

  const q = query(ref, where('templateId', '==', templateId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
  }

  await batch.commit();
}

const BATCH_LIMIT = 500;

/**
 * Delete all skip records for a household (e.g. when resetting / clearing data).
 */
export async function deleteAllSkipRecords(householdId: string): Promise<void> {
  const db = getDb();
  const ref = getSkipRecordsRef(householdId);
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
 * Check if a skip record exists
 */
export async function hasSkipRecord(
  householdId: string,
  templateId: string,
  dayKey: string
): Promise<boolean> {
  const ref = getSkipRecordRef(householdId, templateId, dayKey);
  if (!ref) return false;

  const docSnap = await getDoc(ref);
  return docSnap.exists();
}

/**
 * Subscribe to skip records for a household
 */
export function subscribeToSkipRecords(
  householdId: string,
  onData: (skipRecords: SkipRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = getSkipRecordsRef(householdId);
  if (!ref) {
    return () => {};
  }

  return onSnapshot(
    ref,
    (snapshot) => {
      const skipRecords = snapshot.docs
        .map(docToSkipRecord)
        .filter((sr): sr is SkipRecord => sr !== null);
      onData(skipRecords);
    },
    (error) => {
      console.error('SkipRecords subscription error:', error);
      onError?.(error);
    }
  );
}
