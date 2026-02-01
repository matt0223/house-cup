/**
 * Firestore service for Challenge documents
 */

import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { Challenge } from '../../domain/models/Challenge';

const SUBCOLLECTION = 'challenges';

/**
 * Get a reference to the challenges subcollection
 */
function getChallengesRef(
  householdId: string
): FirebaseFirestoreTypes.CollectionReference {
  return firestore()
    .collection('households')
    .doc(householdId)
    .collection(SUBCOLLECTION);
}

/**
 * Get a reference to a specific challenge document
 */
function getChallengeRef(
  householdId: string,
  challengeId: string
): FirebaseFirestoreTypes.DocumentReference {
  return getChallengesRef(householdId).doc(challengeId);
}

/**
 * Convert Firestore document to Challenge
 */
function docToChallenge(
  doc: FirebaseFirestoreTypes.DocumentSnapshot
): Challenge | null {
  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
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
  const snapshot = await getChallengesRef(householdId)
    .where('isCompleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

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
  const doc = await getChallengeRef(householdId, challengeId).get();
  return docToChallenge(doc);
}

/**
 * Create a new challenge
 */
export async function createChallenge(
  householdId: string,
  challenge: Omit<Challenge, 'id' | 'createdAt'>
): Promise<Challenge> {
  const ref = getChallengesRef(householdId).doc();
  const now = firestore.FieldValue.serverTimestamp();

  const data = {
    ...challenge,
    createdAt: now,
  };

  await ref.set(data);

  return {
    ...challenge,
    id: ref.id,
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
  await getChallengeRef(householdId, challengeId).update(updates);
}

/**
 * Get completed challenges (for history)
 */
export async function getCompletedChallenges(
  householdId: string,
  limit = 10
): Promise<Challenge[]> {
  const snapshot = await getChallengesRef(householdId)
    .where('isCompleted', '==', true)
    .orderBy('endDayKey', 'desc')
    .limit(limit)
    .get();

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
): () => void {
  return getChallengesRef(householdId)
    .where('isCompleted', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .onSnapshot(
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
