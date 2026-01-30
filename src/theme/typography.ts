import { TextStyle, Platform } from 'react-native';

/**
 * Typography tokens for House Cup design system.
 * Uses system fonts with rounded design for a friendly feel.
 */

// Font family - use system rounded fonts where available
const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

/**
 * Typography variants matching the design system
 */
export const typography = {
  /** App title - 28pt Bold. Usage: "House Cup" header */
  appTitle: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  } as TextStyle,

  /** Score number - 48pt Bold. Usage: Large score digits */
  scoreNumber: {
    fontFamily,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  } as TextStyle,

  /** Headline - 17pt Semibold. Usage: Partner names, section titles */
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

  /** Callout - 15pt Regular. Usage: Date range, prize text */
  callout: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  /** Caption - 13pt Regular. Usage: Tab labels, secondary info */
  caption: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,

  /** Day letter - 15pt Medium. Usage: Day letters in strip */
  dayLetter: {
    fontFamily,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  } as TextStyle,

  /** Button - 17pt Semibold. Usage: Primary button labels */
  button: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,

  /** Chip initial - 14pt Semibold. Usage: Competitor initial in chips */
  chipInitial: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  } as TextStyle,
} as const;

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;
