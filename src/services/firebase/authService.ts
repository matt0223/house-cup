/**
 * Firebase Authentication Service (JS SDK)
 *
 * Handles user authentication for the House Cup app.
 * Supports:
 * - Anonymous auth for frictionless onboarding
 * - Sign in with Apple for account recovery and persistence
 * - Linking Apple to anonymous accounts (preserves data)
 */

import {
  User,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  OAuthProvider,
  signInWithCredential,
  linkWithCredential,
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
 * Check if Sign in with Apple is available on this device
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Check if the current user has Apple account linked
 */
export function isAppleLinked(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === 'apple.com');
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

/**
 * Sign in with Apple (for returning users)
 * This signs in directly with Apple credentials
 */
export async function signInWithApple(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth is not configured');
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

  // Create Firebase credential
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce: nonce,
  });

  // Sign in to Firebase
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

/**
 * Link Apple account to current anonymous user
 * This preserves all existing data while adding Apple sign-in capability
 */
export async function linkAppleAccount(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Auth is not configured');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user is currently signed in');
  }

  if (isAppleLinked()) {
    throw new Error('Apple account is already linked');
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

  // Create Firebase credential
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce: nonce,
  });

  // Link to current user (preserves anonymous user's data)
  const result = await linkWithCredential(currentUser, credential);
  return result.user;
}

export default {
  getCurrentUser,
  getCurrentUserId,
  signInAnonymously,
  signOut,
  subscribeToAuthState,
  ensureAuthenticated,
  isAppleAuthAvailable,
  isAppleLinked,
  signInWithApple,
  linkAppleAccount,
};
