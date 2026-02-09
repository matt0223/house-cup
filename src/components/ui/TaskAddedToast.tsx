import React, { useRef, useEffect } from 'react';
import { Text, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';

export interface TaskAddedToastProps {
  /** Whether the toast should be visible */
  visible: boolean;
  /** Called when the toast finishes hiding */
  onHidden: () => void;
  /** Custom message to display (defaults to "Task added") */
  message?: string;
}

const ANIMATION_DURATION = 200;
const VISIBLE_DURATION = 3000;
const TRANSLATE_DISTANCE = 10;

/**
 * Floating pill toast that shows "Task added" with fade+slide animations.
 * Positioned at the top of the screen, horizontally centered.
 */
export function TaskAddedToast({ visible, onHidden, message = 'Task added' }: TaskAddedToastProps) {
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-TRANSLATE_DISTANCE)).current;

  // Timer ref for auto-dismiss
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Clear any existing timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      // Stop any running animations
      opacity.stopAnimation();
      translateY.stopAnimation();

      // Reset to start position
      opacity.setValue(0);
      translateY.setValue(-TRANSLATE_DISTANCE);

      // Appear animation: fade in + slide down
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
      ]).start(() => {
        // After appear animation, set timer for auto-dismiss
        hideTimerRef.current = setTimeout(() => {
          runHideAnimation();
        }, VISIBLE_DURATION);
      });
    } else {
      // Trigger hide animation when visible becomes false
      runHideAnimation();
    }
  }, [visible]);

  const runHideAnimation = () => {
    // Clear timer if running
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    // Disappear animation: fade out + slide up
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -TRANSLATE_DISTANCE,
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHidden();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          opacity,
          transform: [{ translateY }],
          ...shadows.medium,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[typography.body, { color: colors.textPrimary }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1000,
  },
});

export default TaskAddedToast;
