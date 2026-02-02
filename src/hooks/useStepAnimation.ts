import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * Hook for managing step-based animations in multi-step flows.
 * Provides fade animation between steps.
 */
export function useStepAnimation() {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  /**
   * Animate transition to a new step.
   * Fades out, calls the step change callback, then fades in.
   */
  const animateStepChange = useCallback(
    (onStepChange: () => void) => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      // Change step immediately (animation runs in parallel)
      onStepChange();
    },
    [fadeAnim]
  );

  return {
    fadeAnim,
    animateStepChange,
  };
}

export default useStepAnimation;
