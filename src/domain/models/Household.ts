import { Competitor } from './Competitor';

/**
 * Day the week starts on (for challenge boundaries).
 * 0 = Sunday, 1 = Monday
 */
export type WeekStartDay = 0 | 1;

/**
 * Represents the household containing the competing partners.
 * All date logic uses the household's timezone.
 */
export interface Household {
  /** Unique identifier */
  id: string;

  /** The two competitors in this household */
  competitors: [Competitor, Competitor];

  /** IANA timezone identifier (e.g., "America/New_York") */
  timezone: string;

  /** Day the week starts on (0 = Sunday, 1 = Monday) */
  weekStartDay: WeekStartDay;

  /** Short code for partner to join */
  joinCode?: string;

  /** When the household was created */
  createdAt: string;
}

// Sample data for development
export const sampleHousehold: Household = {
  id: 'household-1',
  competitors: [
    { id: 'competitor-a', name: 'Pri', color: '#9B7FD1' },
    { id: 'competitor-b', name: 'Matt', color: '#5B9BD5' },
  ],
  timezone: 'America/New_York',
  weekStartDay: 0, // Sunday
  createdAt: '2026-01-01T00:00:00Z',
};
