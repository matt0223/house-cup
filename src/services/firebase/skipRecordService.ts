/**
 * Firestore service for SkipRecord documents
 */

import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { SkipRecord, getSkipRecordKey } from '../../domain/models/SkipRecord';

const SUBCOLLECTION = 'skipRecords';

/**
 * Get a reference to the skipRecords subcollection
 */
function getSkipRecordsRef(
  householdId: string
): FirebaseFirestoreTypes.CollectionReference {
  return firestore()
    .collection('households')
    .doc(householdId)
    .collection(SUBCOLLECTION);
}

/**
 * Get a reference to a specific skip record document
 * Uses templateId:dayKey as the document ID for easy deduplication
 */
function getSkipRecordRef(
  householdId: string,
  templateId: string,
  dayKey: string
): FirebaseFirestoreTypes.DocumentReference {
  const docId = getSkipRecordKey(templateId, dayKey);
  return getSkipRecordsRef(householdId).doc(docId);
}

/**
 * Convert Firestore document to SkipRecord
 */
function docToSkipRecord(
  doc: FirebaseFirestoreTypes.DocumentSnapshot
): SkipRecord | null {
  if (!doc.exists) return null;

  const data = doc.data();
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
  const snapshot = await getSkipRecordsRef(householdId).get();

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
  const snapshot = await getSkipRecordsRef(householdId)
    .where('templateId', '==', templateId)
    .get();

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
  await getSkipRecordRef(
    householdId,
    skipRecord.templateId,
    skipRecord.dayKey
  ).set(skipRecord);
}

/**
 * Add multiple skip records in a batch
 */
export async function addSkipRecordsBatch(
  householdId: string,
  skipRecords: SkipRecord[]
): Promise<void> {
  if (skipRecords.length === 0) return;

  const batch = firestore().batch();

  for (const sr of skipRecords) {
    const ref = getSkipRecordRef(householdId, sr.templateId, sr.dayKey);
    batch.set(ref, sr);
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
  await getSkipRecordRef(householdId, templateId, dayKey).delete();
}

/**
 * Remove all skip records for a template
 */
export async function removeSkipRecordsForTemplate(
  householdId: string,
  templateId: string
): Promise<void> {
  const snapshot = await getSkipRecordsRef(householdId)
    .where('templateId', '==', templateId)
    .get();

  if (snapshot.empty) return;

  const batch = firestore().batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }

  await batch.commit();
}

/**
 * Check if a skip record exists
 */
export async function hasSkipRecord(
  householdId: string,
  templateId: string,
  dayKey: string
): Promise<boolean> {
  const doc = await getSkipRecordRef(householdId, templateId, dayKey).get();
  return doc.exists;
}

/**
 * Subscribe to skip records for a household
 */
export function subscribeToSkipRecords(
  householdId: string,
  onData: (skipRecords: SkipRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  return getSkipRecordsRef(householdId).onSnapshot(
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
