/**
 * Apple Authentication Hook
 *
 * Provides Apple sign-in functionality for account linking and recovery.
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  isAppleAuthAvailable,
  isAppleLinked,
  signInWithApple,
  linkAppleAccount,
} from '../services/firebase';

interface UseAppleAuthResult {
  /** Whether Sign in with Apple is available on this device */
  isAvailable: boolean;
  /** Whether the current user has Apple account linked */
  isLinked: boolean;
  /** Whether a sign-in or link operation is in progress */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Link Apple account to current anonymous user */
  linkAccount: () => Promise<boolean>;
  /** Sign in with Apple (for returning users) */
  signIn: () => Promise<boolean>;
  /** Clear any error message */
  clearError: () => void;
}

/**
 * Hook for Apple authentication operations.
 *
 * Usage:
 * ```tsx
 * const { isAvailable, isLinked, linkAccount, signIn, isLoading, error } = useAppleAuth();
 *
 * // Link existing anonymous account to Apple
 * if (!isLinked && isAvailable) {
 *   await linkAccount();
 * }
 *
 * // Sign in with Apple (for returning users)
 * await signIn();
 * ```
 */
export function useAppleAuth(): UseAppleAuthResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check availability and link status on mount
  useEffect(() => {
    async function checkAvailability() {
      // Apple auth only available on iOS
      if (Platform.OS !== 'ios') {
        setIsAvailable(false);
        return;
      }

      try {
        const available = await isAppleAuthAvailable();
        setIsAvailable(available);
        setIsLinked(isAppleLinked());
      } catch (err) {
        console.error('Error checking Apple auth availability:', err);
        setIsAvailable(false);
      }
    }

    checkAvailability();
  }, []);

  // Link Apple account to current anonymous user
  const linkAccount = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await linkAppleAccount();
      setIsLinked(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to link Apple account';
      // Handle user cancellation gracefully
      if (message.includes('canceled') || message.includes('cancelled')) {
        setError(null);
        return false;
      }
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign in with Apple (for returning users)
  const signIn = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithApple();
      setIsLinked(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Apple';
      // Handle user cancellation gracefully
      if (message.includes('canceled') || message.includes('cancelled')) {
        setError(null);
        return false;
      }
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAvailable,
    isLinked,
    isLoading,
    error,
    linkAccount,
    signIn,
    clearError,
  };
}

export default useAppleAuth;
