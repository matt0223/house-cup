/**
 * Firestore service for user profile documents (per-user preferences).
 * Uses collection "users" with document ID = Firebase Auth uid.
 */

import { doc, getDoc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getDb } from './firebaseConfig';
import { ThemePreference } from '../../domain/models/Household';

const COLLECTION = 'users';

export interface UserProfile {
  themePreference?: ThemePreference;
}

function getUserRef(userId: string) {
  const db = getDb();
  if (!db) return null;
  return doc(db, COLLECTION, userId);
}

/**
 * Get the current user's profile (e.g. theme preference).
 * Returns null if not found or Firestore not configured.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const ref = getUserRef(userId);
  if (!ref) return null;
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    themePreference: (data?.themePreference as ThemePreference) ?? undefined,
  };
}

/**
 * Update the current user's profile. Creates the document if it doesn't exist (merge).
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const ref = getUserRef(userId);
  if (!ref) throw new Error('Firestore is not configured');
  await setDoc(ref, updates, { merge: true });
}

/**
 * Subscribe to the user's profile for real-time sync (e.g. theme changed on another device).
 */
export function subscribeToUserProfile(
  userId: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = getUserRef(userId);
  if (!ref) {
    onData(null);
    return () => {};
  }
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data();
      onData({
        themePreference: (data?.themePreference as ThemePreference) ?? undefined,
      });
    },
    (err) => {
      console.error('User profile subscription error:', err);
      onError?.(err);
    }
  );
}
