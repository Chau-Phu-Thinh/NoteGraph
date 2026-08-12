import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme/tokens';

interface FilterChipsProps {
  chips: string[];
  selected: string;
  onSelect: (chip: string) => void;
}

export default function FilterChips({ chips, selected, onSelect }: FilterChipsProps) {
  return (
    <View style={styles.container}>
      {chips.map((chip) => {
        const isSelected = chip === selected;
        return (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(chip)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {chip}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.chipPaddingV,
    paddingHorizontal: Spacing.chipPaddingH,
    borderRadius: Radius.chip,
    backgroundColor: Colors.chipDefaultBg,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    ...Typography.chipLabel,
    color: Colors.chipDefaultText,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});
