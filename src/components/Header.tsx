import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Sizes, Typography } from '../theme/tokens';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  titleColor?: string;
}

export default function Header({ title, onMenuPress, onBackPress, rightAction, titleColor }: HeaderProps) {
  return (
    <View style={styles.container}>
      {onBackPress ? (
        <TouchableOpacity onPress={onBackPress} style={styles.iconButton}>
          <MaterialCommunityIcons name="arrow-left" size={Sizes.iconSize} color={Colors.textPrimary} />
        </TouchableOpacity>
      ) : onMenuPress ? (
        <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
          <MaterialCommunityIcons name="menu" size={Sizes.iconSize} color={Colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}

      <Text style={[styles.title, titleColor ? { color: titleColor } : null]} numberOfLines={1}>
        {title}
      </Text>

      {rightAction ? rightAction : <View style={styles.iconButton} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Sizes.headerHeight,
    paddingHorizontal: Spacing.screenPadding,
    backgroundColor: 'transparent',
  },
  title: {
    ...Typography.screenTitle,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    width: Sizes.minTouchTarget,
    height: Sizes.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
