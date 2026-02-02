import { Competitor } from './Competitor';

/**
 * Day the week starts on (for challenge boundaries).
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
 */
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * User's theme preference.
 * - 'system': Follow device settings
 * - 'light': Always light mode
 * - 'dark': Always dark mode
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Represents the household containing the competing partners.
 * All date logic uses the household's timezone.
 */
export interface Household {
  /** Unique identifier */
  id: string;

  /**
   * The competitors in this household.
   * Can be 1 or 2 competitors. If 2 and one has no userId, they're pending.
   */
  competitors: Competitor[] | [Competitor, Competitor];

  /** IANA timezone identifier (e.g., "America/New_York") */
  timezone: string;

  /** Day the week starts on (0 = Sunday through 6 = Saturday) */
  weekStartDay: WeekStartDay;

  /** Default prize for new challenges */
  prize?: string;

  /** User's theme preference */
  themePreference?: ThemePreference;

  /** Short code for partner to join */
  joinCode?: string;

  /** When the household was created */
  createdAt: string;
}

// Sample data for development
export const sampleHousehold: Household = {
  id: 'household-1',
  competitors: [
    { id: 'competitor-a', name: 'Pri', color: '#9B7FD1', userId: 'user-1' },
    { id: 'competitor-b', name: 'Matt', color: '#5B9BD5', userId: 'user-2' },
  ],
  timezone: 'America/New_York',
  weekStartDay: 0, // Sunday
  prize: 'Sleep-in weekend',
  createdAt: '2026-01-01T00:00:00Z',
};
