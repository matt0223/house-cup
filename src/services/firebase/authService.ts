/**
 * Firebase Authentication Service (JS SDK)
 *
 * Handles user authentication for the House Cup app.
 * Apple Sign-In is required for all users.
 */

import {
  User,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  OAuthProvider,
  signInWithCredential,
  Unsubscribe,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
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

/**
 * Generate a secure random nonce for Apple sign-in
 */
async function generateNonce(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(new Uint8Array(randomBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a string using SHA256 (required for Apple sign-in nonce)
 */
async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

/** Result of Apple Sign-In including the Firebase user and optional first name */
export interface AppleSignInResult {
  user: User;
  /** First name from Apple credential (only provided on first sign-in for this Apple ID + app) */
  givenName?: string;
}

/**
 * Sign in with Apple (for returning users)
 * This signs in directly with Apple credentials.
 * 
 * Important: This signs out any current user first to ensure
 * we properly authenticate with the Apple credential and get
 * the correct Firebase user (the one linked to this Apple ID).
 * 
 * Returns the Firebase user and the givenName from Apple (if available).
 * Apple only provides the name on the FIRST sign-in for a given Apple ID + app combo.
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth is not configured');
  }

  // Sign out any current user first (e.g., auto-created anonymous user)
  // This ensures signInWithCredential will properly find the existing
  // Apple-linked user instead of potentially creating a new one
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }

  // Generate nonce for security
  const nonce = await generateNonce();
  const hashedNonce = await sha256(nonce);

  // Request Apple sign-in
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error('No identity token received from Apple');
  }

  // Capture givenName before it's lost — Apple only sends this on first sign-in
  const givenName = appleCredential.fullName?.givenName ?? undefined;

  // Create Firebase credential
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce: nonce,
  });

  // Sign in to Firebase - this will sign in as the existing Apple user
  // if the credential is already linked, or create a new user if not
  const result = await signInWithCredential(auth, credential);
  return { user: result.user, givenName };
}

export default {
  getCurrentUser,
  getCurrentUserId,
  signInAnonymously,
  signOut,
  subscribeToAuthState,
  ensureAuthenticated,
  signInWithApple,
};
