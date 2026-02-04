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
  collection,
  doc,
} from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth,
  connectAuthEmulator,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Firebase configuration object.
 * 
 * Uses environment variables to switch between dev and production Firebase projects:
 * - Development (Expo Go): reads from .env.development → house-cup-dev project
 * - Production (TestFlight): reads from .env.production → house-cup-3e1d7 project
 * 
 * @see .env.example for the expected environment variables
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
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
 * Uses AsyncStorage for persistence so auth state survives app restarts
 */
export function getFirebaseAuth(): Auth | null {
  if (authInstance) {
    return authInstance;
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  // Use initializeAuth with AsyncStorage persistence for React Native
  // This ensures the user stays logged in between app sessions
  try {
    authInstance = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error: unknown) {
    // If auth is already initialized (e.g., hot reload), get the existing instance
    const err = error as { code?: string };
    if (err.code === 'auth/already-initialized') {
      authInstance = getAuth(firebaseApp);
    } else {
      throw error;
    }
  }
  
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

/**
 * Generate a Firestore-compatible document ID.
 * This can be used to pre-generate IDs for optimistic updates
 * so the local and Firestore IDs match.
 */
export function generateFirestoreId(): string {
  const db = getDb();
  if (!db) {
    // Fallback to local ID generation if Firestore not available
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  // Create a reference to a temp collection and get its auto-generated ID
  return doc(collection(db, '_temp')).id;
}

export default {
  getDb,
  getFirebaseAuth,
  isFirebaseConfigured,
  enableOfflinePersistence,
  connectToEmulators,
  generateFirestoreId,
};
