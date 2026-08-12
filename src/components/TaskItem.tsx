import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme/tokens';
import { Task } from '../types';
import Checkbox from './Checkbox';

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onPress?: (task: Task) => void;
}

export default function TaskItem({ task, onToggle, onPress }: TaskItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(task)}
      activeOpacity={0.8}
    >
      <Checkbox checked={task.is_completed} onToggle={() => onToggle(task)} />
      <Text
        style={[
          styles.text,
          task.is_completed && styles.completedText,
        ]}
        numberOfLines={1}
      >
        {task.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.chipDefaultBg,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  text: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
});
