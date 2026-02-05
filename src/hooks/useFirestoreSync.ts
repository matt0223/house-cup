/**
 * Firestore Sync Hook
 *
 * Manages real-time synchronization between Firestore and Zustand stores.
 * Subscribes to Firestore collections and updates local state when data changes.
 */

import { useEffect, useState } from 'react';
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
  /** Called when household is not found (deleted from Firestore) */
  onHouseholdNotFound?: () => void;
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
  onHouseholdNotFound,
}: UseFirestoreSyncOptions): UseFirestoreSyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store setters
  const setHousehold = useHouseholdStore((s) => s.setHousehold);
  const setChallenge = useChallengeStore((s) => s.setChallenge);
  const setTasks = useChallengeStore((s) => s.setTasks);
  const setSkipRecordsChallenge = useChallengeStore((s) => s.setSkipRecords);
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

    // Track task unsubscriber separately (managed within challenge callback)
    let unsubTasks: (() => void) | null = null;

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
        } else {
          // Household was deleted or doesn't exist
          onHouseholdNotFound?.();
        }
      },
      handleError('Household sync')
    );
    unsubscribers.push(unsubHousehold);

    // 2. Subscribe to current challenge (and tasks when challenge is received)
    const unsubChallenge = subscribeToCurrentChallenge(
      householdId,
      (challenge: Challenge | null) => {
        // Clean up previous task subscription when challenge changes
        if (unsubTasks) {
          unsubTasks();
          unsubTasks = null;
        }

        if (challenge) {
          setChallenge(challenge);

          // Subscribe to tasks for this challenge
          unsubTasks = subscribeToTasks(
            householdId,
            challenge.id,
            (tasks: TaskInstance[]) => {
              setTasks(tasks);
            },
            handleError('Tasks sync')
          );
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

    // 4. Subscribe to skip records (update both stores so seeding sees latest)
    const unsubSkipRecords = subscribeToSkipRecords(
      householdId,
      (skipRecords: SkipRecord[]) => {
        setSkipRecords(skipRecords);
        setSkipRecordsChallenge(skipRecords);
      },
      handleError('Skip records sync')
    );
    unsubscribers.push(unsubSkipRecords);

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      // Also clean up task subscription
      if (unsubTasks) {
        unsubTasks();
      }
      setIsSyncing(false);
    };
  }, [enabled, householdId, setHousehold, setChallenge, setTasks, setSkipRecordsChallenge, setTemplates, setSkipRecords, onHouseholdNotFound]);

  return {
    isSyncing,
    error,
  };
}

export default useFirestoreSync;
