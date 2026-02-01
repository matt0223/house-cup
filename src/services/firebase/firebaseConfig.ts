/**
 * Firebase Configuration (JS SDK)
 *
 * This module initializes Firebase for the House Cup app using the web/JS SDK.
 * This version works with Expo Go and doesn't require native builds.
 *
 * @see docs/FIREBASE_SETUP.md for setup instructions
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
} from 'firebase/auth';

/**
 * Firebase configuration object.
 * 
 * TODO: Move back to environment variables once env loading is fixed.
 * For now, hardcoded to verify Firebase connection works.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAmz8uv_VR-m0KymecHPKy5GOUXIG0qEic',
  authDomain: 'house-cup-3e1d7.firebaseapp.com',
  projectId: 'house-cup-3e1d7',
  storageBucket: 'house-cup-3e1d7.firebasestorage.app',
  messagingSenderId: '672206621674',
  appId: '1:672206621674:web:5090f15a0a0ec9c5334093',
};

// Initialize Firebase app (singleton)
let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let authInstance: Auth | null = null;

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

/**
 * Initialize Firebase app
 */
function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (app) {
    return app;
  }

  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
  } else {
    app = initializeApp(firebaseConfig);
  }

  return app;
}

/**
 * Get Firestore database instance
 */
export function getDb(): Firestore | null {
  if (firestoreDb) {
    return firestoreDb;
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  firestoreDb = getFirestore(firebaseApp);
  return firestoreDb;
}

/**
 * Firestore database instance (for backward compatibility)
 * Returns null if Firebase is not configured
 */
export const db: Firestore | null = null; // Will be initialized lazily

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth | null {
  if (authInstance) {
    return authInstance;
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  authInstance = getAuth(firebaseApp);
  return authInstance;
}

/**
 * Firebase Auth instance (for backward compatibility)
 */
export const firebaseAuth: Auth | null = null; // Will be initialized lazily

/**
 * Enable Firestore offline persistence
 * This allows the app to work offline and sync when back online
 */
export async function enableOfflinePersistence(): Promise<void> {
  const database = getDb();
  if (!database) {
    return;
  }

  try {
    await enableIndexedDbPersistence(database);
    console.log('Firestore offline persistence enabled');
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('Firestore persistence not supported in this browser');
    } else {
      console.warn('Firestore persistence setup:', error);
    }
  }
}

/**
 * Connect to local emulators (for development)
 */
export function connectToEmulators(
  firestoreHost = 'localhost',
  firestorePort = 8080,
  authHost = 'localhost',
  authPort = 9099
): void {
  const database = getDb();
  const auth = getFirebaseAuth();

  if (database) {
    connectFirestoreEmulator(database, firestoreHost, firestorePort);
  }
  if (auth) {
    connectAuthEmulator(auth, `http://${authHost}:${authPort}`);
  }
}

export default {
  getDb,
  getFirebaseAuth,
  isFirebaseConfigured,
  enableOfflinePersistence,
  connectToEmulators,
};
