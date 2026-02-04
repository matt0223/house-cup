/**
 * Apple Sign In Button
 *
 * Renders Apple's official Sign in with Apple button.
 * Follows Apple's Human Interface Guidelines for button styling.
 */

import React from 'react';
import { StyleSheet, View, Platform, Text, TouchableOpacity } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '../../theme/useTheme';

export interface AppleSignInButtonProps {
  /** Called when button is pressed */
  onPress: () => void;
  /** Button mode - 'sign-in', 'continue', or 'link' */
  mode?: 'sign-in' | 'continue' | 'link';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom width (defaults to 100%) */
  width?: number | '100%';
}

/**
 * Apple Sign In Button component.
 *
 * Uses Apple's native button on iOS, and a styled fallback for other platforms.
 * Per Apple guidelines, the button must use Apple's official styling.
 *
 * Usage:
 * ```tsx
 * <AppleSignInButton
 *   onPress={handleAppleSignIn}
 *   mode="link"
 * />
 * ```
 */
export function AppleSignInButton({
  onPress,
  mode = 'sign-in',
  disabled = false,
  width = '100%',
}: AppleSignInButtonProps) {
  const { colors, spacing, radius } = useTheme();

  // Map mode to Apple button type
  const getButtonType = () => {
    switch (mode) {
      case 'continue':
      case 'link':
        return AppleAuthentication.AppleAuthenticationButtonType.CONTINUE;
      case 'sign-in':
      default:
        return AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN;
    }
  };

  // Only show native Apple button on iOS
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, { width }]}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={getButtonType()}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.medium}
          style={[styles.button, { opacity: disabled ? 0.5 : 1 }]}
          onPress={disabled ? undefined : onPress}
        />
      </View>
    );
  }

  // Fallback for non-iOS platforms (shouldn't be needed, but just in case)
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.fallbackButton,
        {
          backgroundColor: colors.text,
          borderRadius: radius.medium,
          paddingVertical: spacing.md,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={[styles.fallbackText, { color: colors.background }]}>
        {mode === 'sign-in' ? 'Sign in with Apple' : 'Continue with Apple'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 50,
  },
  fallbackButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default AppleSignInButton;
