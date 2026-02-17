/**
 * Firestore service for app configuration (JS SDK)
 *
 * Reads global config documents like version info and feature flags.
 * Config documents live in the top-level `config` collection and are
 * read-only for clients (admin-only writes via Cloud Functions or console).
 */

import { doc, getDoc } from 'firebase/firestore';
import { getDb } from './firebaseConfig';

const COLLECTION = 'config';
const APP_VERSION_DOC = 'appVersion';

/**
 * Fetch the latest build number from Firestore.
 * Returns null if Firebase is not configured or the document doesn't exist.
 */
export async function getLatestBuildNumber(): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const docRef = doc(db, COLLECTION, APP_VERSION_DOC);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    return data?.latestBuildNumber ?? null;
  } catch (error) {
    console.warn('Failed to fetch latest build number:', error);
    return null;
  }
}
