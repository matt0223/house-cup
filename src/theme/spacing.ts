/**
 * Spacing tokens for consistent layout rhythm.
 * Based on a 4pt base unit.
 */

export const spacing = {
  /** 4pt - Minimal spacing for tight elements */
  xxxs: 4,

  /** 8pt - Small spacing for related elements */
  xxs: 8,

  /** 12pt - Compact spacing */
  xs: 12,

  /** 16pt - Default spacing for most use cases */
  sm: 16,

  /** 20pt - Medium spacing */
  md: 20,

  /** 24pt - Comfortable spacing between sections */
  lg: 24,

  /** 32pt - Large spacing for visual separation */
  xl: 32,

  /** 48pt - Extra large spacing for major sections */
  xxl: 48,

  /** 64pt - Maximum spacing */
  xxxl: 64,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;
