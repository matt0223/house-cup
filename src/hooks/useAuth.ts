/**
 * Auth Hook (JS SDK)
 *
 * Manages Firebase authentication state and provides auth-related actions.
 * Does not create anonymous users; auth state is restored from persistence (e.g. Apple Sign-In).
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToAuthState,
  signOut as firebaseSignOut,
} from '../services/firebase';
import { isFirebaseConfigured } from '../services/firebase/firebaseConfig';

interface UseAuthResult {
  /** Current authenticated user */
  user: User | null;
  /** User's ID (null if not authenticated) */
  userId: string | null;
  /** Whether auth is still initializing */
  isLoading: boolean;
  /** Whether Firebase is configured */
  isConfigured: boolean;
  /** Any auth errors */
  error: string | null;
  /** Sign out the current user */
  signOut: () => Promise<void>;
}

/**
 * Hook to manage Firebase authentication state.
 *
 * Auth state is restored from persistence (e.g. Apple Sign-In). No anonymous users are created.
 *
 * Usage:
 * ```tsx
 * const { user, userId, isLoading, error } = useAuth();
 *
 * if (isLoading) return <LoadingScreen />;
 * if (!userId) return <OnboardingScreen />;
 * ```
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isFirebaseConfigured();

  // Subscribe to auth state changes (persistence restores Apple user on reload).
  // When the first callback is null, delay "loading done" briefly so persistence can restore the user.
  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    let persistenceTimeout: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeToAuthState((authUser) => {
      if (authUser) {
        if (persistenceTimeout) clearTimeout(persistenceTimeout);
        setUser(authUser);
        setIsLoading(false);
      } else {
        // Null: give persistence a moment to restore (e.g. Apple user on iOS)
        persistenceTimeout = setTimeout(() => {
          setUser(null);
          setIsLoading(false);
        }, 1500);
      }
    });

    return () => {
      if (persistenceTimeout) clearTimeout(persistenceTimeout);
      unsubscribe();
    };
  }, [isConfigured]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut();
      setUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Sign out failed: ${message}`);
    }
  }, []);

  return {
    user,
    userId: user?.uid ?? null,
    isLoading,
    isConfigured,
    error,
    signOut,
  };
}

export default useAuth;
