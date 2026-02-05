/**
 * Apple Authentication Hook
 *
 * Provides Apple Sign-In functionality.
 * Apple Sign-In is required for all users during onboarding.
 */

import { useState, useCallback } from 'react';
import { signInWithApple } from '../services/firebase';

interface UseAppleAuthResult {
  /** Whether a sign-in operation is in progress */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Sign in with Apple */
  signIn: () => Promise<boolean>;
  /** Clear any error message */
  clearError: () => void;
}

/**
 * Hook for Apple authentication.
 *
 * Usage:
 * ```tsx
 * const { signIn, isLoading, error } = useAppleAuth();
 *
 * // Sign in with Apple
 * const success = await signIn();
 * ```
 */
export function useAppleAuth(): UseAppleAuthResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign in with Apple
  const signIn = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithApple();
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
    isLoading,
    error,
    signIn,
    clearError,
  };
}

export default useAppleAuth;
