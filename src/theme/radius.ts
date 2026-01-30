/**
 * Corner radius tokens for consistent rounded corners.
 */

export const radius = {
  /** 8pt - Small radius for subtle rounding */
  small: 8,

  /** 12pt - Medium radius */
  medium: 12,

  /** 16pt - Large radius for cards */
  large: 16,

  /** 24pt - Extra large radius */
  xl: 24,

  /** Full pill shape (use a large number) */
  pill: 999,
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof Radius;
