import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Sizes } from '../theme/tokens';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
}

export default function Checkbox({ checked, onToggle }: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.checkbox, checked && styles.checked]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {checked && <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: Sizes.checkboxSize,
    height: Sizes.checkboxSize,
    borderRadius: Sizes.checkboxSize / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
