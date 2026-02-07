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
import { useUserProfileStore } from '../store/useUserProfileStore';
import {
  isFirebaseConfigured,
  createHousehold as createHouseholdInFirestore,
  findHouseholdByJoinCode,
  findHouseholdByUserId,
  claimCompetitorSlot,
  markCompetitorInvited,
  addPendingCompetitor,
  createChallenge,
  getCurrentUserId,
  deleteAllTasks,
  deleteAllTemplates,
  deleteAllSkipRecords,
  subscribeToUserProfile,
} from '../services/firebase';
import { Competitor, isPendingCompetitor } from '../domain/models/Competitor';
import { getCurrentWeekWindow, getTodayDayKey } from '../domain/services';

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
  /** Create a new household (returns join code) */
  createHousehold: (
    yourName: string,
    yourColor: string,
    housemateName?: string,
    housemateColor?: string,
    prize?: string
  ) => Promise<string>;
  /** Join an existing household by code (claims pending competitor slot) */
  joinHousehold: (
    code: string,
    yourName: string,
    yourColor: string
  ) => Promise<void>;
  /** Mark a pending competitor as invited (sets inviteSentAt timestamp) */
  markInviteSent: (competitorId: string) => Promise<void>;
  /** Add a pending housemate to the household (returns the new competitor) */
  addHousemate: (name: string, color: string) => Promise<Competitor>;
  /** Recover household after Apple sign-in (finds household by userId) */
  recoverHousehold: () => Promise<boolean>;
  /** Delete all tasks, templates, and skip records from Firestore for this household and clear local state (for testing / fresh start) */
  clearAllHouseholdTaskData: () => Promise<void>;
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

  // Handle household not found (deleted from Firestore)
  const handleHouseholdNotFound = useCallback(() => {
    console.log('Household not found, clearing local state');
    setHouseholdId(null);
  }, [setHouseholdId]);

  // Firestore sync (only active when we have a householdId and an authenticated user)
  const { isSyncing, error: syncError } = useFirestoreSync({
    householdId,
    enabled: isConfigured && !!householdId && !!userId,
    onHouseholdNotFound: handleHouseholdNotFound,
  });

  // Store setters
  const setSyncEnabledHousehold = useHouseholdStore((s) => s.setSyncEnabled);
  const setHouseholdInStore = useHouseholdStore((s) => s.setHousehold);
  const household = useHouseholdStore((s) => s.household);

  // Enable sync in stores when we have a householdId and authenticated user
  useEffect(() => {
    if (isConfigured && householdId && userId) {
      setSyncEnabledHousehold(true);
      useChallengeStore.getState().setSyncEnabled(true, householdId);
      useRecurringStore.getState().setSyncEnabled(true, householdId);
    } else {
      setSyncEnabledHousehold(false);
      useChallengeStore.getState().setSyncEnabled(false, null);
      useRecurringStore.getState().setSyncEnabled(false, null);
    }
  }, [isConfigured, householdId, userId, setSyncEnabledHousehold]);

  // Subscribe to current user's profile (e.g. theme preference); clear when signed out
  useEffect(() => {
    if (!isConfigured || !userId) {
      useUserProfileStore.getState().clearUserProfile();
      return;
    }
    const unsub = subscribeToUserProfile(userId, (profile) => {
      useUserProfileStore.getState().setThemePreferenceFromSync(
        profile?.themePreference ?? 'system'
      );
    });
    return () => unsub();
  }, [isConfigured, userId]);

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

  // Create a new household (with your profile and optionally a pending housemate)
  const createHousehold = useCallback(
    async (
      yourName: string,
      yourColor: string,
      housemateName?: string,
      housemateColor?: string,
      prize?: string
    ): Promise<string> => {
      if (!userId) {
        throw new Error('Must be authenticated to create household');
      }

      const joinCode = generateJoinCode();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timestamp = Date.now();

      // Create competitors array
      const competitors: Competitor[] = [
        { id: `competitor-${timestamp}-1`, name: yourName, color: yourColor, userId },
      ];

      // If housemate info provided, create a pending competitor (no userId)
      if (housemateName && housemateColor) {
        competitors.push({
          id: `competitor-${timestamp}-2`,
          name: housemateName,
          color: housemateColor,
          // No userId - they're pending until they join
        });
      }

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

      // Create initial challenge in Firestore
      const weekWindow = getCurrentWeekWindow(timezone, newHousehold.weekStartDay);
      const initialChallenge = await createChallenge(newHousehold.id, {
        householdId: newHousehold.id,
        startDayKey: weekWindow.startDayKey,
        endDayKey: weekWindow.endDayKey,
        prize: prize || 'Winner picks dinner!',
        winnerId: null,
        isTie: false,
        isCompleted: false,
      });

      // Set challenge in store (with Firestore ID)
      useChallengeStore.getState().setChallenge(initialChallenge);
      useChallengeStore.getState().setSelectedDay(getTodayDayKey(timezone));

      // Return the join code so caller can share it
      return joinCode;
    },
    [userId, setHouseholdInStore, setHouseholdId]
  );

  // Join an existing household by code (claims pending competitor slot)
  const joinHousehold = useCallback(
    async (code: string, yourName: string, yourColor: string): Promise<void> => {
      if (!userId) {
        throw new Error('Must be authenticated to join household');
      }

      // Find household by join code
      const foundHousehold = await findHouseholdByJoinCode(code.toUpperCase());
      if (!foundHousehold) {
        throw new Error('Invalid join code');
      }

      // Find pending competitor (one without userId)
      const pendingCompetitor = foundHousehold.competitors.find(isPendingCompetitor);
      
      if (!pendingCompetitor) {
        // No pending competitor - check if household is full
        const hasJoinedCompetitors = foundHousehold.competitors.filter(c => c.userId).length;
        if (hasJoinedCompetitors >= 2) {
          throw new Error('This household is full');
        }
        // Edge case: household has only 1 competitor and no pending slot
        // This shouldn't happen with the new flow, but handle it gracefully
        throw new Error('No pending invite found for this household');
      }

      // Claim the pending competitor slot with userId and optionally update name/color
      const updatedHousehold = await claimCompetitorSlot(
        foundHousehold.id,
        pendingCompetitor.id,
        userId,
        { name: yourName, color: yourColor }
      );

      // Update local state
      setHouseholdInStore(updatedHousehold);
      setHouseholdId(updatedHousehold.id);

      // Challenge will be synced automatically via subscribeToCurrentChallenge
      // Set selected day to today
      useChallengeStore.getState().setSelectedDay(
        getTodayDayKey(updatedHousehold.timezone)
      );
    },
    [userId, setHouseholdInStore, setHouseholdId]
  );

  // Mark a pending competitor as invited
  const markInviteSent = useCallback(
    async (competitorId: string): Promise<void> => {
      // Optimistic update FIRST - ensures UI updates immediately
      const currentHousehold = useHouseholdStore.getState().household;
      if (currentHousehold) {
        const updatedCompetitors = currentHousehold.competitors.map(c =>
          c.id === competitorId
            ? { ...c, inviteSentAt: new Date().toISOString() }
            : c
        );
        setHouseholdInStore({
          ...currentHousehold,
          competitors: updatedCompetitors,
        });
      }

      // Then persist to Firestore in background
      if (householdId) {
        markCompetitorInvited(householdId, competitorId).catch((error) => {
          console.error('Failed to persist invite status:', error);
        });
      }
    },
    [householdId, setHouseholdInStore]
  );

  // Add a pending housemate to the household
  const addHousemate = useCallback(
    async (name: string, color: string): Promise<Competitor> => {
      if (!householdId) {
        throw new Error('No household to add housemate to');
      }

      const newCompetitor: Competitor = {
        id: `competitor-${Date.now()}-2`,
        name,
        color,
        // No userId - they're pending until they join
      };

      const updatedHousehold = await addPendingCompetitor(householdId, newCompetitor);

      // Update local state
      setHouseholdInStore(updatedHousehold);

      return newCompetitor;
    },
    [householdId, setHouseholdInStore]
  );

  // Recover household after Apple sign-in
  // Note: We get the userId directly from Firebase Auth instead of React state
  // to avoid race conditions where the state hasn't updated yet after sign-in
  const recoverHousehold = useCallback(async (): Promise<boolean> => {
    // Get current user ID directly from Firebase Auth (not React state)
    // This ensures we have the correct ID immediately after sign-in
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      console.log('recoverHousehold: No current user');
      return false;
    }

    console.log('recoverHousehold: Looking for household with userId:', currentUserId);

    try {
      const foundHousehold = await findHouseholdByUserId(currentUserId);
      if (foundHousehold) {
        console.log('recoverHousehold: Found household:', foundHousehold.id);
        setHouseholdInStore(foundHousehold);
        setHouseholdId(foundHousehold.id);
        return true;
      }
      console.log('recoverHousehold: No household found for user');
      return false;
    } catch (error) {
      console.error('Failed to recover household:', error);
      return false;
    }
  }, [setHouseholdInStore, setHouseholdId]);

  // Clear all tasks, templates, skip records from Firestore and reset local challenge/recurring state
  const clearAllHouseholdTaskData = useCallback(async (): Promise<void> => {
    if (!householdId) return;
    try {
      await deleteAllTasks(householdId);
      await deleteAllTemplates(householdId);
      await deleteAllSkipRecords(householdId);
      useChallengeStore.getState().reset();
      useRecurringStore.getState().reset();
    } catch (error) {
      console.error('Failed to clear household task data:', error);
      throw error;
    }
  }, [householdId]);

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
    markInviteSent,
    addHousemate,
    recoverHousehold,
    clearAllHouseholdTaskData,
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
