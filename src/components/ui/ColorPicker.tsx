import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { availableCompetitorColors } from '../../domain/models/Competitor';

export interface ColorPickerProps {
  /** Currently selected color (hex) */
  selectedColor: string;
  /** Called when a color is selected */
  onColorSelect: (hex: string) => void;
  /** Colors that are unavailable (e.g., used by other competitor) */
  unavailableColors?: string[];
}

/**
 * A horizontal row of color swatches for selecting a competitor color.
 */
export function ColorPicker({
  selectedColor,
  onColorSelect,
  unavailableColors = [],
}: ColorPickerProps) {
  const { spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: spacing.xs }]}>
      {availableCompetitorColors.map((color) => {
        const isSelected = color.hex.toLowerCase() === selectedColor.toLowerCase();
        const isUnavailable = unavailableColors.some(
          (c) => c.toLowerCase() === color.hex.toLowerCase()
        );

        return (
          <TouchableOpacity
            key={color.id}
            style={[
              styles.swatch,
              {
                backgroundColor: color.hex,
                opacity: isUnavailable ? 0.3 : 1,
              },
            ]}
            onPress={() => !isUnavailable && onColorSelect(color.hex)}
            disabled={isUnavailable}
            activeOpacity={0.7}
            accessibilityLabel={`${color.name}${isSelected ? ', selected' : ''}${isUnavailable ? ', unavailable' : ''}`}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ColorPicker;
