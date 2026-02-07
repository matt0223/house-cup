/**
 * Firebase Services
 *
 * Centralized exports for all Firestore operations.
 */

// Config and initialization
export {
  db,
  firebaseAuth,
  isFirebaseConfigured,
  enableOfflinePersistence,
} from './firebaseConfig';

// Authentication
export * from './authService';

// Household operations
export * from './householdService';

// Challenge operations
export * from './challengeService';

// Task operations
export * from './taskService';

// Template operations
export * from './templateService';

// Skip record operations
export * from './skipRecordService';

// User profile (per-user preferences, e.g. theme)
export * from './userService';
