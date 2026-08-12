import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme/tokens';
import { Tag } from '../types';

interface TagChipProps {
  tag: Tag;
  onRemove?: (tag: Tag) => void;
  selected?: boolean;
}

const TAG_COLORS: Record<string, string> = {
  work: Colors.primary,
  design: Colors.primary,
  meetings: Colors.primary,
  urgent: Colors.tagUrgent,
  personal: Colors.tagPersonal,
};

export default function TagChip({ tag, onRemove, selected }: TagChipProps) {
  const bgColor = TAG_COLORS[tag.name.toLowerCase()] || Colors.primaryUltralight;
  const isColoredTag = !!TAG_COLORS[tag.name.toLowerCase()];
  const textColor = isColoredTag ? '#FFFFFF' : Colors.textPrimary;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>#{tag.name}</Text>
      {onRemove && (
        <TouchableOpacity onPress={() => onRemove(tag)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
          <MaterialCommunityIcons name="close" size={12} color={textColor} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});
