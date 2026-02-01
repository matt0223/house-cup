/**
 * Firestore Sync Hook
 *
 * Subscribes to Firestore collections and pushes updates to Zustand stores.
 * This is the bridge between Firebase real-time data and local UI state.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useHouseholdStore } from '../store/useHouseholdStore';
import { useChallengeStore } from '../store/useChallengeStore';
import { useRecurringStore } from '../store/useRecurringStore';
import {
  subscribeToHousehold,
  subscribeToCurrentChallenge,
  subscribeToTasks,
  subscribeToTemplates,
  subscribeToSkipRecords,
  isFirebaseConfigured,
  enableOfflinePersistence,
} from '../services/firebase';
import { Household } from '../domain/models/Household';
import { Challenge } from '../domain/models/Challenge';
import { TaskInstance } from '../domain/models/TaskInstance';
import { RecurringTemplate } from '../domain/models/RecurringTemplate';
import { SkipRecord } from '../domain/models/SkipRecord';

interface UseFirestoreSyncOptions {
  /** The household ID to sync (required for data access) */
  householdId: string | null;
  /** Whether sync is enabled */
  enabled?: boolean;
}

interface UseFirestoreSyncResult {
  /** Whether Firebase is configured and ready */
  isConfigured: boolean;
  /** Whether we're currently syncing */
  isSyncing: boolean;
  /** Any sync errors */
  error: string | null;
}

/**
 * Hook to sync Firestore data with Zustand stores.
 *
 * Usage:
 * ```tsx
 * const { isConfigured, isSyncing, error } = useFirestoreSync({
 *   householdId: currentHouseholdId,
 *   enabled: true,
 * });
 * ```
 */
export function useFirestoreSync({
  householdId,
  enabled = true,
}: UseFirestoreSyncOptions): UseFirestoreSyncResult {
  const isSyncingRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  // Store setters
  const setHousehold = useHouseholdStore((s) => s.setHousehold);
  
  // For challenge store, we need to set data directly
  // We'll use a custom approach since we can't set state directly
  const challengeStore = useChallengeStore.getState;
  
  // For recurring store
  const recurringStore = useRecurringStore.getState;

  // Check if Firebase is configured
  const isConfigured = isFirebaseConfigured();

  // Initialize offline persistence once
  useEffect(() => {
    if (isConfigured) {
      enableOfflinePersistence().catch(console.warn);
    }
  }, [isConfigured]);

  // Subscribe to Firestore collections
  useEffect(() => {
    if (!enabled || !householdId || !isConfigured) {
      return;
    }

    isSyncingRef.current = true;
    errorRef.current = null;

    const unsubscribers: (() => void)[] = [];

    // Track current challenge ID for task subscription
    let currentChallengeId: string | null = null;
    let taskUnsubscribe: (() => void) | null = null;

    // 1. Subscribe to household
    const householdUnsub = subscribeToHousehold(
      householdId,
      (household: Household | null) => {
        if (household) {
          setHousehold(household);
        }
      },
      (error) => {
        errorRef.current = `Household sync error: ${error.message}`;
        console.error('Household sync error:', error);
      }
    );
    unsubscribers.push(householdUnsub);

    // 2. Subscribe to current challenge
    const challengeUnsub = subscribeToCurrentChallenge(
      householdId,
      (challenge: Challenge | null) => {
        // Update challenge in store
        useChallengeStore.setState({ challenge });

        // If challenge changed, update task subscription
        if (challenge?.id !== currentChallengeId) {
          // Unsubscribe from old tasks
          if (taskUnsubscribe) {
            taskUnsubscribe();
            taskUnsubscribe = null;
          }

          currentChallengeId = challenge?.id ?? null;

          // Subscribe to new challenge's tasks
          if (challenge) {
            taskUnsubscribe = subscribeToTasks(
              householdId,
              challenge.id,
              (tasks: TaskInstance[]) => {
                useChallengeStore.setState({ tasks });
              },
              (error) => {
                errorRef.current = `Tasks sync error: ${error.message}`;
                console.error('Tasks sync error:', error);
              }
            );
          } else {
            // No challenge, clear tasks
            useChallengeStore.setState({ tasks: [] });
          }
        }
      },
      (error) => {
        errorRef.current = `Challenge sync error: ${error.message}`;
        console.error('Challenge sync error:', error);
      }
    );
    unsubscribers.push(challengeUnsub);

    // 3. Subscribe to templates
    const templatesUnsub = subscribeToTemplates(
      householdId,
      (templates: RecurringTemplate[]) => {
        useRecurringStore.setState({ templates });
      },
      (error) => {
        errorRef.current = `Templates sync error: ${error.message}`;
        console.error('Templates sync error:', error);
      }
    );
    unsubscribers.push(templatesUnsub);

    // 4. Subscribe to skip records
    const skipRecordsUnsub = subscribeToSkipRecords(
      householdId,
      (skipRecords: SkipRecord[]) => {
        useRecurringStore.setState({ skipRecords });
        // Also update challenge store's skip records for seeding
        useChallengeStore.setState({ skipRecords });
      },
      (error) => {
        errorRef.current = `SkipRecords sync error: ${error.message}`;
        console.error('SkipRecords sync error:', error);
      }
    );
    unsubscribers.push(skipRecordsUnsub);

    // Cleanup
    return () => {
      isSyncingRef.current = false;
      unsubscribers.forEach((unsub) => unsub());
      if (taskUnsubscribe) {
        taskUnsubscribe();
      }
    };
  }, [enabled, householdId, isConfigured, setHousehold]);

  return {
    isConfigured,
    isSyncing: isSyncingRef.current,
    error: errorRef.current,
  };
}

export default useFirestoreSync;
