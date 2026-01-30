/**
 * Represents a household member competing in the House Cup.
 * Each competitor has their own color and tracks points for tasks.
 */
export interface Competitor {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Color for UI elements (hex string) */
  color: string;
}

/**
 * Get the first letter of a competitor's name, uppercased.
 */
export function getCompetitorInitial(competitor: Competitor): string {
  return competitor.name.charAt(0).toUpperCase();
}

/**
 * Available colors for competitors to choose from.
 * Orange variants are excluded as they're reserved for the app's primary accent.
 */
export const availableCompetitorColors = [
  { id: 'purple', hex: '#9B7FD1', name: 'Purple' },
  { id: 'blue', hex: '#5B9BD5', name: 'Blue' },
  { id: 'teal', hex: '#4ECDC4', name: 'Teal' },
  { id: 'green', hex: '#7CB342', name: 'Green' },
  { id: 'pink', hex: '#E57373', name: 'Pink' },
  { id: 'indigo', hex: '#5C6BC0', name: 'Indigo' },
  { id: 'cyan', hex: '#26C6DA', name: 'Cyan' },
  { id: 'amber', hex: '#FFCA28', name: 'Amber' },
] as const;

/**
 * Check if a color is valid for competitors (not reserved).
 */
export function isValidCompetitorColor(hex: string): boolean {
  return availableCompetitorColors.some(
    (c) => c.hex.toLowerCase() === hex.toLowerCase()
  );
}

// Sample data for development and previews
export const sampleCompetitors: Competitor[] = [
  {
    id: 'competitor-a',
    name: 'Pri',
    color: '#9B7FD1', // Purple chip color
  },
  {
    id: 'competitor-b',
    name: 'Matt',
    color: '#5B9BD5', // Blue chip color
  },
];

export const sampleCompetitorA = sampleCompetitors[0];
export const sampleCompetitorB = sampleCompetitors[1];
