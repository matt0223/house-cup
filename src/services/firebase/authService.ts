/**
 * Firebase Authentication Service (JS SDK)
 *
 * Handles user authentication for the House Cup app.
 * Uses anonymous auth for simplicity - users are identified by their
 * Firebase UID which is linked to their household via memberIds array.
 */

import {
  User,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebaseConfig';

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  return auth.currentUser;
}

/**
 * Get the current user's ID
 */
export function getCurrentUserId(): string | null {
  return getCurrentUser()?.uid ?? null;
}

/**
 * Sign in anonymously
 * Creates a new anonymous account if not already signed in
 */
export async function signInAnonymously(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth is not configured');
  }
  const { user } = await firebaseSignInAnonymously(auth);
  return user;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth is not configured');
  }
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(
  onStateChanged: (user: User | null) => void
): Unsubscribe {
  const auth = getFirebaseAuth();
  if (!auth) {
    // Return a no-op unsubscribe if auth is not configured
    return () => {};
  }
  return onAuthStateChanged(auth, onStateChanged);
}

/**
 * Ensure user is authenticated (sign in anonymously if not)
 */
export async function ensureAuthenticated(): Promise<User> {
  const currentUser = getCurrentUser();
  if (currentUser) {
    return currentUser;
  }
  return signInAnonymously();
}

export default {
  getCurrentUser,
  getCurrentUserId,
  signInAnonymously,
  signOut,
  subscribeToAuthState,
  ensureAuthenticated,
};
