/**
 * Auth Hook (JS SDK)
 *
 * Manages Firebase authentication state and provides auth-related actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  subscribeToAuthState,
  ensureAuthenticated,
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
 * Automatically signs in anonymously if no user is authenticated.
 *
 * Usage:
 * ```tsx
 * const { user, userId, isLoading, error } = useAuth();
 *
 * if (isLoading) return <LoadingScreen />;
 * if (!userId) return <ErrorScreen />;
 * ```
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isFirebaseConfigured();

  // Subscribe to auth state changes
  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToAuthState((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    // Ensure authenticated on mount
    ensureAuthenticated()
      .then(setUser)
      .catch((err) => {
        console.error('Auth error:', err);
        setError(`Authentication failed: ${err.message}`);
        setIsLoading(false);
      });

    return unsubscribe;
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
