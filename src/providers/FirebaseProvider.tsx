/**
 * Firebase Provider
 *
 * Initializes Firebase authentication and Firestore sync.
 * Wraps the app to provide Firebase services throughout.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { useHouseholdStore } from '../store/useHouseholdStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { useRecurringStore } from '../store/useRecurringStore';
import { isFirebaseConfigured } from '../services/firebase';

interface FirebaseContextValue {
  /** Whether Firebase is configured */
  isConfigured: boolean;
  /** Current user ID */
  userId: string | null;
  /** Whether auth is loading */
  isAuthLoading: boolean;
  /** Current household ID */
  householdId: string | null;
  /** Set the household ID (for join flow) */
  setHouseholdId: (id: string | null) => void;
  /** Whether Firestore sync is active */
  isSyncing: boolean;
  /** Any sync or auth errors */
  error: string | null;
  /** Whether running in offline mode (Firebase not configured) */
  isOfflineMode: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

interface FirebaseProviderProps {
  children: ReactNode;
}

/**
 * Provider that initializes Firebase auth and sync.
 *
 * When Firebase is not configured (no config files), the app runs in
 * "offline mode" using only local Zustand state with sample data.
 */
export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const isConfigured = isFirebaseConfigured();
  const [householdId, setHouseholdId] = useState<string | null>(null);

  // Auth state (only active when Firebase is configured)
  const { userId, isLoading: isAuthLoading, error: authError } = useAuth();

  // Firestore sync (only active when we have a householdId)
  const { isSyncing, error: syncError } = useFirestoreSync({
    householdId,
    enabled: isConfigured && !!householdId,
  });

  // Store setters
  const setSyncEnabledHousehold = useHouseholdStore((s) => s.setSyncEnabled);
  const loadSampleHousehold = useHouseholdStore((s) => s.loadSampleData);
  const household = useHouseholdStore((s) => s.household);

  // Enable sync in stores when we have a householdId
  useEffect(() => {
    if (isConfigured && householdId) {
      setSyncEnabledHousehold(true);
      useChallengeStore.getState().setSyncEnabled(true, householdId);
      useRecurringStore.getState().setSyncEnabled(true, householdId);
    } else {
      setSyncEnabledHousehold(false);
      useChallengeStore.getState().setSyncEnabled(false, null);
      useRecurringStore.getState().setSyncEnabled(false, null);
    }
  }, [isConfigured, householdId, setSyncEnabledHousehold]);

  // In offline mode, load sample data
  useEffect(() => {
    if (!isConfigured && !household) {
      loadSampleHousehold();
      useRecurringStore.getState().loadSampleData();
    }
  }, [isConfigured, household, loadSampleHousehold]);

  // Update householdId from loaded household
  useEffect(() => {
    if (household && !householdId) {
      setHouseholdId(household.id);
    }
  }, [household, householdId]);

  const value: FirebaseContextValue = {
    isConfigured,
    userId,
    isAuthLoading,
    householdId,
    setHouseholdId,
    isSyncing,
    error: authError || syncError,
    isOfflineMode: !isConfigured,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

/**
 * Hook to access Firebase context
 */
export function useFirebase(): FirebaseContextValue {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within FirebaseProvider');
  }
  return context;
}

export default FirebaseProvider;
