/**
 * Firebase Provider
 *
 * Initializes Firebase authentication and Firestore sync.
 * Wraps the app to provide Firebase services throughout.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { useHouseholdStore } from '../store/useHouseholdStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { useRecurringStore } from '../store/useRecurringStore';
import {
  isFirebaseConfigured,
  createHousehold as createHouseholdInFirestore,
  findHouseholdByJoinCode,
  addMemberToHousehold,
} from '../services/firebase';
import { Competitor } from '../domain/models/Competitor';

const HOUSEHOLD_ID_KEY = '@housecup/householdId';

/**
 * Generate a random 6-character join code
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
  /** Create a new household */
  createHousehold: (
    yourName: string,
    yourColor: string,
    housemateName: string,
    housemateColor: string,
    prize?: string
  ) => Promise<void>;
  /** Join an existing household by code */
  joinHousehold: (code: string) => Promise<void>;
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
  const [householdId, setHouseholdIdState] = useState<string | null>(null);
  const [isLoadingHouseholdId, setIsLoadingHouseholdId] = useState(true);

  // Auth state (only active when Firebase is configured)
  const { userId, isLoading: isAuthLoading, error: authError } = useAuth();

  // Load householdId from AsyncStorage on mount
  useEffect(() => {
    if (!isConfigured) {
      setIsLoadingHouseholdId(false);
      return;
    }

    AsyncStorage.getItem(HOUSEHOLD_ID_KEY)
      .then((storedId) => {
        if (storedId) {
          setHouseholdIdState(storedId);
        }
      })
      .catch((err) => {
        console.error('Failed to load householdId:', err);
      })
      .finally(() => {
        setIsLoadingHouseholdId(false);
      });
  }, [isConfigured]);

  // Wrapper to persist householdId when it changes
  const setHouseholdId = useCallback((id: string | null) => {
    setHouseholdIdState(id);
    if (id) {
      AsyncStorage.setItem(HOUSEHOLD_ID_KEY, id).catch((err) => {
        console.error('Failed to save householdId:', err);
      });
    } else {
      AsyncStorage.removeItem(HOUSEHOLD_ID_KEY).catch((err) => {
        console.error('Failed to remove householdId:', err);
      });
    }
  }, []);

  // Firestore sync (only active when we have a householdId)
  const { isSyncing, error: syncError } = useFirestoreSync({
    householdId,
    enabled: isConfigured && !!householdId,
  });

  // Store setters
  const setSyncEnabledHousehold = useHouseholdStore((s) => s.setSyncEnabled);
  const setHouseholdInStore = useHouseholdStore((s) => s.setHousehold);
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

  // Update householdId from loaded household (e.g., from Firestore sync)
  useEffect(() => {
    if (household && !householdId) {
      // Sample data has IDs like "household-1", Firestore IDs are longer alphanumeric
      const isSampleId = household.id.startsWith('household-');
      
      if (!isConfigured || !isSampleId) {
        setHouseholdId(household.id);
      }
    }
  }, [household, householdId, isConfigured]);

  // Create a new household
  const createHousehold = useCallback(
    async (
      yourName: string,
      yourColor: string,
      housemateName: string,
      housemateColor: string,
      prize?: string
    ): Promise<void> => {
      if (!userId) {
        throw new Error('Must be authenticated to create household');
      }

      const joinCode = generateJoinCode();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const competitors: [Competitor, Competitor] = [
        { id: `competitor-${Date.now()}-1`, name: yourName, color: yourColor },
        { id: `competitor-${Date.now()}-2`, name: housemateName, color: housemateColor },
      ];

      const newHousehold = await createHouseholdInFirestore({
        competitors,
        timezone,
        weekStartDay: 0, // Default to Sunday
        memberIds: [userId],
        joinCode,
        prize: prize || 'Winner picks dinner!',
      });

      // Update local state
      setHouseholdInStore(newHousehold);
      setHouseholdId(newHousehold.id);

      // Initialize challenge for the current week
      useChallengeStore.getState().initializeChallenge(
        newHousehold.timezone,
        newHousehold.weekStartDay,
        [], // No templates yet
        []  // No skip records yet
      );
    },
    [userId, setHouseholdInStore]
  );

  // Join an existing household by code
  const joinHousehold = useCallback(
    async (code: string): Promise<void> => {
      if (!userId) {
        throw new Error('Must be authenticated to join household');
      }

      // Find household by join code
      const foundHousehold = await findHouseholdByJoinCode(code.toUpperCase());
      if (!foundHousehold) {
        throw new Error('Invalid join code');
      }

      // Add user to household
      await addMemberToHousehold(foundHousehold.id, userId);

      // Update local state
      setHouseholdInStore(foundHousehold);
      setHouseholdId(foundHousehold.id);

      // Initialize challenge for the current week
      useChallengeStore.getState().initializeChallenge(
        foundHousehold.timezone,
        foundHousehold.weekStartDay,
        [], // Templates will be synced via Firestore
        []  // Skip records will be synced via Firestore
      );
    },
    [userId, setHouseholdInStore]
  );

  const value: FirebaseContextValue = {
    isConfigured,
    userId,
    isAuthLoading: isAuthLoading || isLoadingHouseholdId,
    householdId,
    setHouseholdId,
    isSyncing,
    error: authError || syncError,
    isOfflineMode: !isConfigured,
    createHousehold,
    joinHousehold,
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
