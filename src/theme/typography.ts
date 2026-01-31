import { TextStyle, Platform } from 'react-native';

/**
 * Typography tokens for House Cup design system.
 * 
 * 6 core variants following iOS Human Interface Guidelines:
 * - title: App branding
 * - display: Large numbers (scores)
 * - headline: Emphasis, buttons, section titles
 * - body: Primary content
 * - callout: Secondary content
 * - caption: Smallest text, labels
 */

// Font family - use system fonts
const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  /** Title - 20pt Semibold. Usage: Screen headers */
  title: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  } as TextStyle,

  /** Display - 48pt Bold. Usage: Large score numbers */
  display: {
    fontFamily,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  } as TextStyle,

  /** Headline - 17pt Semibold. Usage: Section titles, buttons, emphasis */
  headline: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,

  /** Body - 17pt Regular. Usage: Task names, general content */
  body: {
    fontFamily,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,

  /** Callout - 15pt Regular. Usage: Secondary info, date ranges, day letters */
  callout: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  /** Caption - 13pt Regular. Usage: Labels, competitor names, smallest text */
  caption: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
} as const;

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;
