/**
 * Firebase Provider
 *
 * Initializes Firebase authentication and Firestore sync.
 * Wraps the app to provide Firebase services throughout.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
import Constants from 'expo-constants';
import { Competitor, isPendingCompetitor } from '../domain/models/Competitor';
import { getCompletedChallenges } from '../services/firebase/challengeService';
import { getTasksForChallenge } from '../services/firebase/taskService';
import { getCurrentWeekWindow, getTodayDayKey } from '../domain/services';
import {
  initAnalytics,
  setAnalyticsUserId,
  setAnalyticsGroup,
  identifyUser,
  identifyUserOnce,
  trackAppOpened,
} from '../services/analytics';

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
  const { user: authUser, userId, isLoading: isAuthLoading, error: authError } = useAuth();

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

  // Initialize Amplitude analytics on mount and track App Opened
  const sessionCountRef = useRef(0);
  const appOpenedTrackedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      await initAnalytics();

      // Track initial App Opened
      const storedCount = await AsyncStorage.getItem('@housecup/sessionCount');
      const count = storedCount ? parseInt(storedCount, 10) + 1 : 1;
      sessionCountRef.current = count;
      await AsyncStorage.setItem('@housecup/sessionCount', String(count));
      trackAppOpened({ 'is first open': count === 1, 'session count': count });
      appOpenedTrackedRef.current = true;
    };
    init();

    // Track App Opened on foreground resume
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === 'active' && appOpenedTrackedRef.current) {
        const storedCount = await AsyncStorage.getItem('@housecup/sessionCount');
        const count = storedCount ? parseInt(storedCount, 10) + 1 : 1;
        sessionCountRef.current = count;
        await AsyncStorage.setItem('@housecup/sessionCount', String(count));
        trackAppOpened({ 'is first open': false, 'session count': count });
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  // Set Amplitude identity when auth and household are available.
  // Prefer the user's email (from Apple Sign-In via Firebase) as the Amplitude
  // userId so users are identifiable in the dashboard. Fall back to Firebase UID.
  useEffect(() => {
    if (!userId) return;
    const amplitudeUserId = authUser?.email ?? userId;
    setAnalyticsUserId(amplitudeUserId);

    if (householdId) {
      setAnalyticsGroup(householdId);
    }
  }, [userId, authUser?.email, householdId]);

  // Set Amplitude user properties when household data is available
  useEffect(() => {
    if (!household || !userId) return;

    const myCompetitor = household.competitors.find(c => c.userId === userId);
    const hasHousemate = household.competitors.filter(c => c.userId).length >= 2;
    const pendingCompetitor = household.competitors.find(c => isPendingCompetitor(c));
    const housemateStatus = hasHousemate ? 'joined' : pendingCompetitor ? 'invited' : 'solo';
    const themePreference = useUserProfileStore.getState().themePreference ?? 'system';

    // Calculate week end day label from weekStartDay
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekEndDay = (household.weekStartDay + 6) % 7;

    // Calculate days since household creation
    let daysSinceCreation: number | undefined;
    if (household.createdAt) {
      const createdDate = new Date(household.createdAt);
      const now = new Date();
      daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    identifyUser({
      'email': authUser?.email ?? undefined,
      'household id': household.id,
      'competitor id': myCompetitor?.id,
      'competitor name': myCompetitor?.name,
      'competitor color': myCompetitor?.color,
      'has housemate': hasHousemate,
      'housemate status': housemateStatus,
      'theme preference': themePreference,
      'week end day': dayLabels[weekEndDay],
      'prize set': !!household.prize && household.prize.length > 0,
      'app version': Constants.expoConfig?.version ?? '1.0.0',
      'days since household creation': daysSinceCreation,
    });

    identifyUserOnce({
      'is household creator': myCompetitor?.id === household.competitors[0]?.id,
    });
  }, [household, userId]);

  // Compute competition stats from Firestore in the background and set as user properties.
  // Runs once per app launch when household is available. Includes current week tasks
  // from the challenge store for up-to-date "active days" counting.
  const competitionStatsComputedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!household || !userId || !isConfigured) return;
    // Only compute once per household per app session
    if (competitionStatsComputedRef.current === household.id) return;
    competitionStatsComputedRef.current = household.id;

    const myCompetitor = household.competitors.find(c => c.userId === userId);
    if (!myCompetitor) return;
    const myId = myCompetitor.id;

    (async () => {
      try {
        // Fetch all completed challenges (up to 200 — covers ~4 years of weekly data)
        const completedChallenges = await getCompletedChallenges(household.id);

        // Fetch tasks for each completed challenge in parallel
        const taskArrays = await Promise.all(
          completedChallenges.map(c => getTasksForChallenge(household.id, c.id))
        );

        // Compute stats from completed challenges
        const totalCompleted = completedChallenges.length;
        const totalWon = completedChallenges.filter(c => c.winnerId === myId).length;
        const percentageWon = totalCompleted > 0
          ? Math.round((totalWon / totalCompleted) * 100)
          : 0;

        const totalActiveCompetitions = completedChallenges.filter((_, i) => {
          return taskArrays[i].some(t => (t.points?.[myId] ?? 0) > 0);
        }).length;

        // Count unique active days across all completed challenges
        const activeDayKeys = new Set<string>();
        taskArrays.flat().forEach(t => {
          if ((t.points?.[myId] ?? 0) > 0) activeDayKeys.add(t.dayKey);
        });

        // Also include current week's active days from the challenge store
        const currentTasks = useChallengeStore.getState().tasks;
        currentTasks.forEach(t => {
          if ((t.points?.[myId] ?? 0) > 0) activeDayKeys.add(t.dayKey);
        });

        identifyUser({
          'total competitions completed': totalCompleted,
          'total competitions won': totalWon,
          'percentage competitions won': percentageWon,
          'total active competitions': totalActiveCompetitions,
          'total active days': activeDayKeys.size,
        });
      } catch (err) {
        console.warn('Failed to compute competition stats for Amplitude:', err);
      }
    })();
  }, [household?.id, userId, isConfigured]);

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

  // Safety net: if we have a cached householdId but the household data hasn't
  // arrived after sync has been enabled for a few seconds, the document was
  // likely deleted. Try a direct lookup and clear if not found.
  useEffect(() => {
    if (!isConfigured || !householdId || !userId || household) return;

    const timeout = setTimeout(async () => {
      // Only run if household is still null after the timeout
      const currentHousehold = useHouseholdStore.getState().household;
      if (currentHousehold) return;

      console.log('Safety net: householdId cached but no data received, attempting recovery...');
      try {
        const found = await findHouseholdByUserId(userId);
        if (found) {
          setHouseholdInStore(found);
          setHouseholdId(found.id);
        } else {
          console.log('Safety net: household not found, clearing stale householdId');
          setHouseholdId(null);
        }
      } catch (err) {
        console.error('Safety net recovery failed:', err);
        setHouseholdId(null);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isConfigured, householdId, userId, household, setHouseholdId, setHouseholdInStore]);

  // Create a new household (with your profile and optionally a pending housemate)
  // Note: reads userId directly from Firebase Auth (not React state) to avoid
  // race conditions when called immediately after sign-in.
  const createHousehold = useCallback(
    async (
      yourName: string,
      yourColor: string,
      housemateName?: string,
      housemateColor?: string,
      prize?: string
    ): Promise<string> => {
      const currentUserId = getCurrentUserId() || userId;
      if (!currentUserId) {
        throw new Error('Must be authenticated to create household');
      }

      const joinCode = generateJoinCode();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timestamp = Date.now();

      // Create competitors array
      const competitors: Competitor[] = [
        { id: `competitor-${timestamp}-1`, name: yourName, color: yourColor, userId: currentUserId },
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
        memberIds: [currentUserId],
        joinCode,
        prize: prize || '',
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
        prize: prize || '',
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
  // Note: reads userId directly from Firebase Auth (not React state) to avoid
  // race conditions when called immediately after sign-in.
  const joinHousehold = useCallback(
    async (code: string, yourName: string, yourColor: string): Promise<void> => {
      const currentUserId = getCurrentUserId() || userId;
      if (!currentUserId) {
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
        currentUserId,
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
