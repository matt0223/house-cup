/**
 * Icon Colors
 *
 * Semantic colors for settings icons and other iconography.
 * These are separate from the main theme colors to allow for
 * consistent icon styling across light and dark modes.
 */

export const iconColors = {
  /** Join code / key icon */
  key: '#FF9500',
  /** Trophy / prize icon */
  trophy: '#E9B44C',
  /** Calendar / schedule icon */
  calendar: '#5B9BD5',
  /** Theme / palette icon */
  theme: '#5C6BC0',
  /** User / person icon */
  user: '#4ECDC4',
  /** Cloud / sync icon */
  cloud: '#26C6DA',
  /** Notifications icon */
  notifications: '#E57373',
  /** Mail / email icon */
  mail: '#7CB342',
  /** Info / about icon */
  info: '#8E8E93',
  /** Feedback / chat icon */
  feedback: '#5B9BD5',
  /** Trash / delete icon */
  trash: '#FF3B30',
} as const;

export type IconColorKey = keyof typeof iconColors;
