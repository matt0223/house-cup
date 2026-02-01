/**
 * Household Auth Hook
 *
 * Combines authentication with household membership management.
 * Handles the flow of creating or joining a household.
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  createHousehold,
  findHouseholdByJoinCode,
  addMemberToHousehold,
  getHousehold,
} from '../services/firebase';
import { Household, WeekStartDay } from '../domain/models/Household';
import { Competitor } from '../domain/models/Competitor';

interface UseHouseholdAuthResult {
  /** Current authenticated user ID */
  userId: string | null;
  /** Whether auth is loading */
  isAuthLoading: boolean;
  /** Whether Firebase is configured */
  isConfigured: boolean;
  /** Auth error if any */
  authError: string | null;
  /** Create a new household */
  createNewHousehold: (
    competitors: [Competitor, Competitor],
    timezone: string,
    weekStartDay?: WeekStartDay
  ) => Promise<Household>;
  /** Join an existing household by code */
  joinHousehold: (joinCode: string) => Promise<Household>;
  /** Get household ID for a user (stored in AsyncStorage or similar) */
  householdId: string | null;
  /** Set the current household ID */
  setHouseholdId: (id: string | null) => void;
}

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

/**
 * Hook to manage household authentication and membership.
 *
 * Usage:
 * ```tsx
 * const { userId, createNewHousehold, joinHousehold, householdId } = useHouseholdAuth();
 *
 * // Create new household
 * const household = await createNewHousehold(competitors, timezone);
 *
 * // Join existing household
 * const household = await joinHousehold('ABC123');
 * ```
 */
export function useHouseholdAuth(): UseHouseholdAuthResult {
  const { userId, isLoading: isAuthLoading, isConfigured, error: authError } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);

  const createNewHousehold = useCallback(
    async (
      competitors: [Competitor, Competitor],
      timezone: string,
      weekStartDay: WeekStartDay = 0
    ): Promise<Household> => {
      if (!userId) {
        throw new Error('Must be authenticated to create household');
      }

      const joinCode = generateJoinCode();

      const household = await createHousehold({
        competitors,
        timezone,
        weekStartDay,
        memberIds: [userId],
        joinCode,
      });

      setHouseholdId(household.id);
      return household;
    },
    [userId]
  );

  const joinHousehold = useCallback(
    async (joinCode: string): Promise<Household> => {
      if (!userId) {
        throw new Error('Must be authenticated to join household');
      }

      // Find household by join code
      const household = await findHouseholdByJoinCode(joinCode.toUpperCase());
      if (!household) {
        throw new Error('Invalid join code');
      }

      // Add user to household
      await addMemberToHousehold(household.id, userId);

      setHouseholdId(household.id);
      return household;
    },
    [userId]
  );

  return {
    userId,
    isAuthLoading,
    isConfigured,
    authError,
    createNewHousehold,
    joinHousehold,
    householdId,
    setHouseholdId,
  };
}

export default useHouseholdAuth;
