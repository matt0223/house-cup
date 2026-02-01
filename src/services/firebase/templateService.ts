/**
 * Firestore service for RecurringTemplate documents
 */

import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { RecurringTemplate } from '../../domain/models/RecurringTemplate';

const SUBCOLLECTION = 'templates';

/**
 * Get a reference to the templates subcollection
 */
function getTemplatesRef(
  householdId: string
): FirebaseFirestoreTypes.CollectionReference {
  return firestore()
    .collection('households')
    .doc(householdId)
    .collection(SUBCOLLECTION);
}

/**
 * Get a reference to a specific template document
 */
function getTemplateRef(
  householdId: string,
  templateId: string
): FirebaseFirestoreTypes.DocumentReference {
  return getTemplatesRef(householdId).doc(templateId);
}

/**
 * Convert Firestore document to RecurringTemplate
 */
function docToTemplate(
  doc: FirebaseFirestoreTypes.DocumentSnapshot
): RecurringTemplate | null {
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
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
  const snapshot = await getTemplatesRef(householdId).get();

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
  const doc = await getTemplateRef(householdId, templateId).get();
  return docToTemplate(doc);
}

/**
 * Create a new template
 */
export async function createTemplate(
  householdId: string,
  template: Pick<RecurringTemplate, 'name' | 'repeatDays'>
): Promise<RecurringTemplate> {
  const ref = getTemplatesRef(householdId).doc();
  const now = firestore.FieldValue.serverTimestamp();

  const data = {
    householdId,
    name: template.name,
    repeatDays: template.repeatDays,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(data);

  const nowIso = new Date().toISOString();
  return {
    id: ref.id,
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
  await getTemplateRef(householdId, templateId).update({
    ...updates,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  householdId: string,
  templateId: string
): Promise<void> {
  await getTemplateRef(householdId, templateId).delete();
}

/**
 * Subscribe to templates for a household
 */
export function subscribeToTemplates(
  householdId: string,
  onData: (templates: RecurringTemplate[]) => void,
  onError?: (error: Error) => void
): () => void {
  return getTemplatesRef(householdId).onSnapshot(
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
