/**
 * Apple Authentication Hook
 *
 * Provides Apple Sign-In functionality.
 * Apple Sign-In is required for all users during onboarding.
 */

import { useState, useCallback, useRef } from 'react';
import { signInWithApple } from '../services/firebase';

interface UseAppleAuthResult {
  /** Whether a sign-in operation is in progress */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Sign in with Apple. Returns the givenName on success, or null on failure/cancel. */
  signIn: () => Promise<string | undefined | null>;
  /** The given name from the Apple credential (only available on first sign-in) */
  givenName: string | undefined;
  /** Clear any error message */
  clearError: () => void;
}

/**
 * Hook for Apple authentication.
 *
 * Usage:
 * ```tsx
 * const { signIn, isLoading, error, givenName } = useAppleAuth();
 *
 * const result = await signIn();
 * // result is givenName on success, null on failure/cancel
 * if (result !== null) {
 *   console.log('Name from Apple:', result); // string | undefined
 * }
 * ```
 */
export function useAppleAuth(): UseAppleAuthResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [givenName, setGivenName] = useState<string | undefined>(undefined);

  // Sign in with Apple
  // Returns givenName (string | undefined) on success, null on failure/cancel
  const signIn = useCallback(async (): Promise<string | undefined | null> => {
    setIsLoading(true);
    setError(null);
    setGivenName(undefined);

    try {
      const result = await signInWithApple();
      setGivenName(result.givenName);
      return result.givenName; // Return directly so caller has it synchronously
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Apple';
      // Handle user cancellation gracefully
      if (message.includes('canceled') || message.includes('cancelled')) {
        setError(null);
        return null;
      }
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    signIn,
    givenName,
    clearError,
  };
}

export default useAppleAuth;
