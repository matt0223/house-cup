/**
 * Firebase Authentication Service
 *
 * Handles user authentication for the House Cup app.
 * Uses anonymous auth for simplicity - users are identified by their
 * Firebase UID which is linked to their household via memberIds array.
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}

/**
 * Get the current user's ID
 */
export function getCurrentUserId(): string | null {
  return auth().currentUser?.uid ?? null;
}

/**
 * Sign in anonymously
 * Creates a new anonymous account if not already signed in
 */
export async function signInAnonymously(): Promise<FirebaseAuthTypes.User> {
  const { user } = await auth().signInAnonymously();
  return user;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await auth().signOut();
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthState(
  onAuthStateChanged: (user: FirebaseAuthTypes.User | null) => void
): () => void {
  return auth().onAuthStateChanged(onAuthStateChanged);
}

/**
 * Ensure user is authenticated (sign in anonymously if not)
 */
export async function ensureAuthenticated(): Promise<FirebaseAuthTypes.User> {
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
