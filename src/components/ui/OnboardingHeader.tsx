import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton } from './IconButton';
import { useTheme } from '../../theme/useTheme';

export interface OnboardingHeaderProps {
  /** Called when back button is pressed */
  onBack: () => void;
  /** Current step (1-indexed) */
  currentStep?: number;
  /** Total number of steps */
  totalSteps?: number;
}

/**
 * Lightweight header for onboarding screens.
 * Shows back button on left, progress dots on right.
 */
export function OnboardingHeader({
  onBack,
  currentStep,
  totalSteps = 3,
}: OnboardingHeaderProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.xs }]}>
      <IconButton
        icon="chevron-back"
        onPress={onBack}
        size="medium"
        accessibilityLabel="Go back"
      />

      {currentStep !== undefined && (
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <View
                key={stepNumber}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      isCompleted || isCurrent
                        ? colors.primary
                        : colors.border,
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default OnboardingHeader;
