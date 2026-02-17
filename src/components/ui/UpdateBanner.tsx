import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';

export interface UpdateBannerProps {
  /** Whether the banner should be visible */
  visible: boolean;
  /** Called when the user taps the dismiss (X) button */
  onDismiss: () => void;
  /** Called when the user taps "Update" */
  onUpdate: () => void;
}

const ANIMATION_DURATION = 300;

/**
 * Soft-nudge banner prompting users to update to the latest version.
 * Uses the standard surface card style so it feels native to the UI.
 * Coral accent on the "Update" pill keeps it on-brand without alarm.
 * Animates in/out smoothly. Returns null when not visible and animation is complete.
 */
export function UpdateBanner({ visible, onDismiss, onUpdate }: UpdateBannerProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const [shouldRender, setShouldRender] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacity.setValue(0);
      translateY.setValue(-10);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: ANIMATION_DURATION,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

  const bannerBg = colors.surface;
  const textColor = colors.textPrimary;
  const accentColor = colors.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          marginHorizontal: spacing.sm,
          marginTop: spacing.xxs,
          marginBottom: spacing.xxxs,
          backgroundColor: bannerBg,
          borderRadius: radius.medium,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          opacity,
          transform: [{ translateY }],
          ...shadows.subtle,
        },
      ]}
    >
      <Ionicons
        name="arrow-up-circle-outline"
        size={18}
        color={textColor}
        style={{ marginRight: spacing.xxs }}
      />

      <Text
        style={[
          typography.callout,
          styles.message,
          { color: textColor },
        ]}
        numberOfLines={1}
      >
        New version available
      </Text>

      <TouchableOpacity
        style={[
          styles.updateButton,
          {
            backgroundColor: accentColor,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing.xxxs,
          },
        ]}
        onPress={onUpdate}
        activeOpacity={0.7}
        accessibilityLabel="Update app"
        accessibilityRole="button"
      >
        <Text
          style={[
            typography.caption,
            { color: '#FFFFFF', fontWeight: '600' },
          ]}
        >
          Update
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dismissButton, { marginLeft: spacing.xxs }]}
        onPress={onDismiss}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss update banner"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={16} color={textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
  },
  updateButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
});

export default UpdateBanner;
