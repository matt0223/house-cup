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
import { Household, WeekStartDay } from '../../domain/models/Household';
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
  updates: Partial<Pick<Household, 'timezone' | 'weekStartDay' | 'prize'>>
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
  updates: Partial<Pick<Competitor, 'name' | 'color' | 'inviteSentAt'>>
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
 * Mark a pending competitor as invited by setting inviteSentAt timestamp
 */
export async function markCompetitorInvited(
  householdId: string,
  competitorId: string
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
  const competitorIndex = competitors.findIndex(c => c.id === competitorId);
  
  if (competitorIndex === -1) {
    throw new Error('Competitor not found');
  }

  competitors[competitorIndex] = {
    ...competitors[competitorIndex],
    inviteSentAt: new Date().toISOString(),
  };

  await updateDoc(ref, { competitors });
}

/**
 * Add a pending competitor to the household (for adding housemate from Settings)
 */
export async function addPendingCompetitor(
  householdId: string,
  competitor: Competitor
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
  
  // Check if household already has 2 competitors
  if (existingCompetitors.length >= 2) {
    throw new Error('Household already has 2 competitors');
  }

  const updatedCompetitors = [...existingCompetitors, competitor];

  await updateDoc(ref, { competitors: updatedCompetitors });

  return {
    id: householdId,
    competitors: updatedCompetitors,
    timezone: data.timezone,
    weekStartDay: data.weekStartDay,
    prize: data.prize,
    joinCode: data.joinCode,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
  };
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
 * Claim a pending competitor slot (when housemate joins)
 * Links the userId to an existing pending competitor and optionally updates name/color
 */
export async function claimCompetitorSlot(
  householdId: string,
  pendingCompetitorId: string,
  userId: string,
  updates?: { name?: string; color?: string }
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

  const competitors = [...data.competitors] as Competitor[];
  const pendingIndex = competitors.findIndex(c => c.id === pendingCompetitorId);
  
  if (pendingIndex === -1) {
    throw new Error('Pending competitor not found');
  }

  // Claim the slot by setting userId and optionally updating name/color
  competitors[pendingIndex] = {
    ...competitors[pendingIndex],
    userId,
    ...(updates?.name ? { name: updates.name } : {}),
    ...(updates?.color ? { color: updates.color } : {}),
  };

  await updateDoc(ref, {
    competitors,
    memberIds: arrayUnion(userId),
  });

  return {
    id: householdId,
    competitors,
    timezone: data.timezone,
    weekStartDay: data.weekStartDay,
    prize: data.prize,
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
 * Find a household by user ID (for account recovery)
 * Searches for households where the user is a member
 */
export async function findHouseholdByUserId(
  userId: string
): Promise<Household | null> {
  const db = getDb();
  if (!db) return null;

  const q = query(
    collection(db, COLLECTION),
    where('memberIds', 'array-contains', userId),
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
