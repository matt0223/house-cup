/**
 * Firestore service for Household documents (JS SDK)
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  DocumentReference,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebaseConfig';
import { Household, ThemePreference, WeekStartDay } from '../../domain/models/Household';
import { Competitor } from '../../domain/models/Competitor';

const COLLECTION = 'households';

/**
 * Get a reference to a household document
 */
export function getHouseholdRef(
  householdId: string
): DocumentReference | null {
  const db = getDb();
  if (!db) return null;
  return doc(db, COLLECTION, householdId);
}

/**
 * Convert Firestore document to Household
 */
function docToHousehold(
  docSnap: DocumentSnapshot
): Household | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  if (!data) return null;

  return {
    id: docSnap.id,
    competitors: data.competitors as Competitor[],
    timezone: data.timezone,
    weekStartDay: data.weekStartDay as WeekStartDay,
    prize: data.prize,
    themePreference: data.themePreference as ThemePreference | undefined,
    joinCode: data.joinCode,
    pendingHousemateName: data.pendingHousemateName,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
  };
}

/**
 * Get a household by ID
 */
export async function getHousehold(
  householdId: string
): Promise<Household | null> {
  const ref = getHouseholdRef(householdId);
  if (!ref) return null;
  
  const docSnap = await getDoc(ref);
  return docToHousehold(docSnap);
}

/**
 * Create a new household
 */
export async function createHousehold(
  household: Omit<Household, 'id' | 'createdAt'> & { memberIds: string[] }
): Promise<Household> {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }

  const ref = doc(collection(db, COLLECTION));
  const now = serverTimestamp();

  const data = {
    ...household,
    createdAt: now,
  };

  await setDoc(ref, data);

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
  const ref = getHouseholdRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await updateDoc(ref, updates);
}

/**
 * Update a competitor in the household
 */
export async function updateCompetitor(
  householdId: string,
  competitorIndex: number,
  updates: Partial<Pick<Competitor, 'name' | 'color'>>
): Promise<void> {
  const ref = getHouseholdRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }

  const docSnap = await getDoc(ref);
  const data = docSnap.data();

  if (!data?.competitors) {
    throw new Error('Household not found or has no competitors');
  }

  const competitors = [...data.competitors] as Competitor[];
  if (competitorIndex >= competitors.length) {
    throw new Error('Competitor index out of bounds');
  }
  
  competitors[competitorIndex] = {
    ...competitors[competitorIndex],
    ...updates,
  };

  await updateDoc(ref, { competitors });
}

/**
 * Add a member to the household (for join flow)
 */
export async function addMemberToHousehold(
  householdId: string,
  userId: string
): Promise<void> {
  const ref = getHouseholdRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await updateDoc(ref, {
    memberIds: arrayUnion(userId),
  });
}

/**
 * Add the second competitor to the household (when housemate joins)
 * Also adds the user to memberIds and clears pendingHousemateName
 */
export async function addCompetitorToHousehold(
  householdId: string,
  competitor: Competitor,
  userId: string
): Promise<Household> {
  const ref = getHouseholdRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }

  const docSnap = await getDoc(ref);
  const data = docSnap.data();

  if (!data) {
    throw new Error('Household not found');
  }

  const existingCompetitors = data.competitors as Competitor[];
  
  // Check if household is full
  if (existingCompetitors.length >= 2) {
    throw new Error('Household is full');
  }

  // Add the new competitor
  const updatedCompetitors = [...existingCompetitors, competitor];

  await updateDoc(ref, {
    competitors: updatedCompetitors,
    memberIds: arrayUnion(userId),
    pendingHousemateName: null, // Clear pending name
  });

  return {
    id: householdId,
    competitors: updatedCompetitors,
    timezone: data.timezone,
    weekStartDay: data.weekStartDay,
    prize: data.prize,
    themePreference: data.themePreference,
    joinCode: data.joinCode,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
  };
}

/**
 * Find a household by join code
 */
export async function findHouseholdByJoinCode(
  joinCode: string
): Promise<Household | null> {
  const db = getDb();
  if (!db) return null;

  const q = query(
    collection(db, COLLECTION),
    where('joinCode', '==', joinCode),
    limit(1)
  );

  const snapshot = await getDocs(q);

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
): Unsubscribe {
  const ref = getHouseholdRef(householdId);
  if (!ref) {
    // Return a no-op unsubscribe if Firestore is not configured
    return () => {};
  }

  return onSnapshot(
    ref,
    (docSnap) => {
      onData(docToHousehold(docSnap));
    },
    (error) => {
      console.error('Household subscription error:', error);
      onError?.(error);
    }
  );
}
