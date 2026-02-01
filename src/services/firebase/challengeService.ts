/**
 * Firestore service for Challenge documents (JS SDK)
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebaseConfig';
import { Challenge } from '../../domain/models/Challenge';

const SUBCOLLECTION = 'challenges';

/**
 * Get a reference to the challenges subcollection
 */
function getChallengesRef(
  householdId: string
): CollectionReference | null {
  const db = getDb();
  if (!db) return null;
  return collection(db, 'households', householdId, SUBCOLLECTION);
}

/**
 * Get a reference to a specific challenge document
 */
function getChallengeRef(
  householdId: string,
  challengeId: string
): DocumentReference | null {
  const db = getDb();
  if (!db) return null;
  return doc(db, 'households', householdId, SUBCOLLECTION, challengeId);
}

/**
 * Convert Firestore document to Challenge
 */
function docToChallenge(
  docSnap: DocumentSnapshot
): Challenge | null {
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  if (!data) return null;

  return {
    id: docSnap.id,
    householdId: data.householdId,
    startDayKey: data.startDayKey,
    endDayKey: data.endDayKey,
    prize: data.prize,
    winnerId: data.winnerId ?? null,
    isTie: data.isTie ?? false,
    isCompleted: data.isCompleted ?? false,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
  };
}

/**
 * Get the current (active) challenge for a household
 */
export async function getCurrentChallenge(
  householdId: string
): Promise<Challenge | null> {
  const ref = getChallengesRef(householdId);
  if (!ref) return null;

  const q = query(
    ref,
    where('isCompleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return docToChallenge(snapshot.docs[0]);
}

/**
 * Get a challenge by ID
 */
export async function getChallenge(
  householdId: string,
  challengeId: string
): Promise<Challenge | null> {
  const ref = getChallengeRef(householdId, challengeId);
  if (!ref) return null;

  const docSnap = await getDoc(ref);
  return docToChallenge(docSnap);
}

/**
 * Create a new challenge
 */
export async function createChallenge(
  householdId: string,
  challenge: Omit<Challenge, 'id' | 'createdAt'>
): Promise<Challenge> {
  const ref = getChallengesRef(householdId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }

  const newDocRef = doc(ref);
  const now = serverTimestamp();

  const data = {
    ...challenge,
    createdAt: now,
  };

  await setDoc(newDocRef, data);

  return {
    ...challenge,
    id: newDocRef.id,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update a challenge
 */
export async function updateChallenge(
  householdId: string,
  challengeId: string,
  updates: Partial<Pick<Challenge, 'prize' | 'winnerId' | 'isTie' | 'isCompleted'>>
): Promise<void> {
  const ref = getChallengeRef(householdId, challengeId);
  if (!ref) {
    throw new Error('Firestore is not configured');
  }
  await updateDoc(ref, updates);
}

/**
 * Get completed challenges (for history)
 */
export async function getCompletedChallenges(
  householdId: string,
  limitCount = 10
): Promise<Challenge[]> {
  const ref = getChallengesRef(householdId);
  if (!ref) return [];

  const q = query(
    ref,
    where('isCompleted', '==', true),
    orderBy('endDayKey', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(docToChallenge)
    .filter((c): c is Challenge => c !== null);
}

/**
 * Subscribe to the current challenge
 */
export function subscribeToCurrentChallenge(
  householdId: string,
  onData: (challenge: Challenge | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = getChallengesRef(householdId);
  if (!ref) {
    return () => {};
  }

  const q = query(
    ref,
    where('isCompleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
      } else {
        onData(docToChallenge(snapshot.docs[0]));
      }
    },
    (error) => {
      console.error('Challenge subscription error:', error);
      onError?.(error);
    }
  );
}
