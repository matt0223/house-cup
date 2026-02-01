/**
 * Firestore service for Household documents
 */

import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { Household, ThemePreference, WeekStartDay } from '../../domain/models/Household';
import { Competitor } from '../../domain/models/Competitor';

const COLLECTION = 'households';

/**
 * Get a reference to a household document
 */
export function getHouseholdRef(
  householdId: string
): FirebaseFirestoreTypes.DocumentReference {
  return firestore().collection(COLLECTION).doc(householdId);
}

/**
 * Convert Firestore document to Household
 */
function docToHousehold(
  doc: FirebaseFirestoreTypes.DocumentSnapshot
): Household | null {
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
    competitors: data.competitors as [Competitor, Competitor],
    timezone: data.timezone,
    weekStartDay: data.weekStartDay as WeekStartDay,
    prize: data.prize,
    themePreference: data.themePreference as ThemePreference | undefined,
    joinCode: data.joinCode,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
  };
}

/**
 * Get a household by ID
 */
export async function getHousehold(
  householdId: string
): Promise<Household | null> {
  const doc = await getHouseholdRef(householdId).get();
  return docToHousehold(doc);
}

/**
 * Create a new household
 */
export async function createHousehold(
  household: Omit<Household, 'id' | 'createdAt'> & { memberIds: string[] }
): Promise<Household> {
  const ref = firestore().collection(COLLECTION).doc();
  const now = firestore.FieldValue.serverTimestamp();

  const data = {
    ...household,
    createdAt: now,
  };

  await ref.set(data);

  return {
    ...household,
    id: ref.id,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update household settings
 */
export async function updateHousehold(
  householdId: string,
  updates: Partial<
    Pick<Household, 'timezone' | 'weekStartDay' | 'prize' | 'themePreference'>
  >
): Promise<void> {
  await getHouseholdRef(householdId).update(updates);
}

/**
 * Update a competitor in the household
 */
export async function updateCompetitor(
  householdId: string,
  competitorIndex: 0 | 1,
  updates: Partial<Pick<Competitor, 'name' | 'color'>>
): Promise<void> {
  const doc = await getHouseholdRef(householdId).get();
  const data = doc.data();

  if (!data?.competitors) {
    throw new Error('Household not found or has no competitors');
  }

  const competitors = [...data.competitors] as [Competitor, Competitor];
  competitors[competitorIndex] = {
    ...competitors[competitorIndex],
    ...updates,
  };

  await getHouseholdRef(householdId).update({ competitors });
}

/**
 * Add a member to the household (for join flow)
 */
export async function addMemberToHousehold(
  householdId: string,
  userId: string
): Promise<void> {
  await getHouseholdRef(householdId).update({
    memberIds: firestore.FieldValue.arrayUnion(userId),
  });
}

/**
 * Find a household by join code
 */
export async function findHouseholdByJoinCode(
  joinCode: string
): Promise<Household | null> {
  const snapshot = await firestore()
    .collection(COLLECTION)
    .where('joinCode', '==', joinCode)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return docToHousehold(snapshot.docs[0]);
}

/**
 * Subscribe to household changes
 */
export function subscribeToHousehold(
  householdId: string,
  onData: (household: Household | null) => void,
  onError?: (error: Error) => void
): () => void {
  return getHouseholdRef(householdId).onSnapshot(
    (doc) => {
      onData(docToHousehold(doc));
    },
    (error) => {
      console.error('Household subscription error:', error);
      onError?.(error);
    }
  );
}
