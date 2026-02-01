/**
 * Firebase Configuration
 *
 * This module initializes Firebase for the House Cup app.
 * The actual config is loaded from GoogleService-Info.plist (iOS)
 * and google-services.json (Android) by the native Firebase SDK.
 *
 * @see docs/FIREBASE_SETUP.md for setup instructions
 */

import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Firebase is auto-initialized by the native SDKs using the config files.
// We just need to export the instances for use in our services.

/**
 * Firestore database instance
 */
export const db = firestore();

/**
 * Firebase Auth instance
 */
export const firebaseAuth = auth();

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  try {
    return firebase.apps.length > 0;
  } catch {
    return false;
  }
}

/**
 * Enable Firestore offline persistence
 * This allows the app to work offline and sync when back online
 */
export async function enableOfflinePersistence(): Promise<void> {
  try {
    await firestore().settings({
      persistence: true,
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });
  } catch (error) {
    // Persistence might already be enabled or fail on web
    console.warn('Firestore persistence setup:', error);
  }
}

export default {
  db,
  firebaseAuth,
  isFirebaseConfigured,
  enableOfflinePersistence,
};
