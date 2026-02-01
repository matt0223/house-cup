/**
 * Firestore Sync Hook
 *
 * Manages real-time synchronization between Firestore and Zustand stores.
 * Subscribes to Firestore collections and updates local state when data changes.
 */

import { useEffect, useState, useRef } from 'react';
import {
  subscribeToHousehold,
  subscribeToCurrentChallenge,
  subscribeToTasks,
  subscribeToTemplates,
  subscribeToSkipRecords,
} from '../services/firebase';
import { useHouseholdStore } from '../store/useHouseholdStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { useRecurringStore } from '../store/useRecurringStore';
import { Household } from '../domain/models/Household';
import { Challenge } from '../domain/models/Challenge';
import { TaskInstance } from '../domain/models/TaskInstance';
import { RecurringTemplate } from '../domain/models/RecurringTemplate';
import { SkipRecord } from '../domain/models/SkipRecord';

interface UseFirestoreSyncOptions {
  /** Household ID to sync */
  householdId: string | null;
  /** Whether sync is enabled */
  enabled?: boolean;
}

interface UseFirestoreSyncResult {
  /** Whether sync is active */
  isSyncing: boolean;
  /** Any sync errors */
  error: string | null;
}

/**
 * Hook to manage Firestore real-time sync with Zustand stores.
 *
 * When enabled, subscribes to all relevant Firestore collections and
 * updates the corresponding Zustand stores when data changes.
 *
 * Usage:
 * ```tsx
 * const { isSyncing, error } = useFirestoreSync({
 *   householdId: 'abc123',
 *   enabled: true,
 * });
 * ```
 */
export function useFirestoreSync({
  householdId,
  enabled = true,
}: UseFirestoreSyncOptions): UseFirestoreSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current challenge ID for task subscription
  const currentChallengeIdRef = useRef<string | null>(null);

  // Store setters
  const setHousehold = useHouseholdStore((s) => s.setHousehold);
  const setChallenge = useChallengeStore((s) => s.setChallenge);
  const setTasks = useChallengeStore((s) => s.setTasks);
  const setTemplates = useRecurringStore((s) => s.setTemplates);
  const setSkipRecords = useRecurringStore((s) => s.setSkipRecords);

  // Subscribe to Firestore collections
  useEffect(() => {
    if (!enabled || !householdId) {
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    setError(null);

    const unsubscribers: (() => void)[] = [];

    // Handle errors consistently
    const handleError = (context: string) => (err: Error) => {
      console.error(`${context} error:`, err);
      setError(`${context}: ${err.message}`);
    };

    // 1. Subscribe to household
    const unsubHousehold = subscribeToHousehold(
      householdId,
      (household: Household | null) => {
        if (household) {
          setHousehold(household);
        }
      },
      handleError('Household sync')
    );
    unsubscribers.push(unsubHousehold);

    // 2. Subscribe to current challenge
    const unsubChallenge = subscribeToCurrentChallenge(
      householdId,
      (challenge: Challenge | null) => {
        if (challenge) {
          setChallenge(challenge);
          currentChallengeIdRef.current = challenge.id;
        }
      },
      handleError('Challenge sync')
    );
    unsubscribers.push(unsubChallenge);

    // 3. Subscribe to templates
    const unsubTemplates = subscribeToTemplates(
      householdId,
      (templates: RecurringTemplate[]) => {
        setTemplates(templates);
      },
      handleError('Templates sync')
    );
    unsubscribers.push(unsubTemplates);

    // 4. Subscribe to skip records
    const unsubSkipRecords = subscribeToSkipRecords(
      householdId,
      (skipRecords: SkipRecord[]) => {
        setSkipRecords(skipRecords);
      },
      handleError('Skip records sync')
    );
    unsubscribers.push(unsubSkipRecords);

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      setIsSyncing(false);
    };
  }, [enabled, householdId, setHousehold, setChallenge, setTemplates, setSkipRecords]);

  // Separate effect for tasks (depends on challenge ID)
  useEffect(() => {
    if (!enabled || !householdId) {
      return;
    }

    // Get the current challenge ID from the store
    const challenge = useChallengeStore.getState().challenge;
    const challengeId = challenge?.id;

    if (!challengeId) {
      return;
    }

    // Subscribe to tasks for the current challenge
    const unsubTasks = subscribeToTasks(
      householdId,
      challengeId,
      (tasks: TaskInstance[]) => {
        setTasks(tasks);
      },
      (err) => {
        console.error('Tasks sync error:', err);
        setError(`Tasks sync: ${err.message}`);
      }
    );

    return unsubTasks;
  }, [enabled, householdId, setTasks]);

  return {
    isSyncing,
    error,
  };
}

export default useFirestoreSync;
