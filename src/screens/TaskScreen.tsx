import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SharedValue } from 'react-native-reanimated';

import Header from '../components/Header';
import TaskItem from '../components/TaskItem';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import { useApp } from '../context/AppContext';
import { Colors, Spacing, Radius, Typography, Shadows } from '../theme/tokens';
import { generateId } from '../utils/helpers';
import type { Task } from '../types';

export default function TaskScreen({ navigation }: any) {
  const {
    tasks,
    localTasks,
    setLocalTasks,
    pendingTaskChanges,
    setPendingTaskChanges,
    saveTaskChanges,
    taskLists,
    loadingTasks,
  } = useApp();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prompt on back navigation if there are unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!pendingTaskChanges) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved task changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setLocalTasks(tasks);
              setPendingTaskChanges(false);
              navigation.dispatch(e.data);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, pendingTaskChanges, setLocalTasks, setPendingTaskChanges, tasks]);

  const handleBackPress = () => {
    if (pendingTaskChanges) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved task changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setLocalTasks(tasks);
              setPendingTaskChanges(false);
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const handleToggleTask = (task: Task) => {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: !t.is_completed } : t))
    );
    setPendingTaskChanges(true);
  };

  const handleDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    setPendingTaskChanges(true);
  };

  const handleAddTask = () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const defaultListId = taskLists[0]?.id;
    if (!defaultListId) {
      Alert.alert('Error', 'The default task list is not ready yet. Please try again.');
      return;
    }
    const newTask: Task = {
      id: generateId(),
      list_id: defaultListId,
      title: trimmed,
      is_completed: false,
      created_at: Date.now(),
      modified_at: Date.now(),
    };

    setLocalTasks((prev) => [newTask, ...prev]);
    setPendingTaskChanges(true);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const initialMap = new Map(tasks.map((t) => [t.id, t]));
      const localMap = new Map(localTasks.map((t) => [t.id, t]));

      const creates: { listId: string; title: string; id: string }[] = [];
      const updates: { id: string; title: string }[] = [];
      const deletes: string[] = [];
      const toggles: string[] = [];

      for (const t of localTasks) {
        if (!initialMap.has(t.id)) {
          creates.push({
            listId: t.list_id,
            title: t.title,
            id: t.id,
          });
          if (t.is_completed) {
            toggles.push(t.id);
          }
        } else {
          const orig = initialMap.get(t.id)!;
          if (orig.title !== t.title) {
            updates.push({ id: t.id, title: t.title });
          }
          if (orig.is_completed !== t.is_completed) {
            toggles.push(t.id);
          }
        }
      }

      for (const t of tasks) {
        if (!localMap.has(t.id)) {
          deletes.push(t.id);
        }
      }

      await saveTaskChanges(creates, updates, deletes, toggles);
    } catch (error) {
      console.error('Failed to save tasks:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const incompleteTasks = useMemo(
    () => localTasks.filter((t) => !t.is_completed),
    [localTasks]
  );

  const completedTasks = useMemo(
    () => localTasks.filter((t) => t.is_completed),
    [localTasks]
  );

  const renderTaskRow = (task: Task) => {
    const renderRightActions = (
      _progress: SharedValue<number>,
      _translation: SharedValue<number>,
      swipeableMethods: any
    ) => (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableMethods?.close?.();
          handleDeleteTask(task.id);
        }}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );

    return (
      <ReanimatedSwipeable
        key={task.id}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') {
            handleDeleteTask(task.id);
          }
        }}
        containerStyle={styles.swipeableContainer}
      >
        <TaskItem task={task} onToggle={handleToggleTask} />
      </ReanimatedSwipeable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.flexOne} edges={['top', 'left', 'right']}>
        <Header
        title="Tasks"
        onBackPress={handleBackPress}
        rightAction={
          pendingTaskChanges ? (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveButton}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.flexOne}>
        {loadingTasks ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.flexOne}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {localTasks.length === 0 ? (
              <EmptyState
                icon="checkbox-marked-circle-outline"
                title="No tasks yet"
                subtitle="Add a new task below to get started."
              />
            ) : (
              <>
                {incompleteTasks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>To Do</Text>
                    {incompleteTasks.map(renderTaskRow)}
                  </View>
                )}

                {completedTasks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Completed ({completedTasks.length})
                    </Text>
                    {completedTasks.map(renderTaskRow)}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        {/* Replace inline input with FAB */}
        <FAB onPress={() => setIsAddingTask(true)} />

        {/* Modal for Adding Task */}
        <Modal
          visible={isAddingTask}
          animationType="fade"
          transparent
          onRequestClose={() => setIsAddingTask(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity 
              style={styles.modalDismissArea} 
              activeOpacity={1} 
              onPress={() => setIsAddingTask(false)} 
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Task</Text>
                <TouchableOpacity onPress={() => setIsAddingTask(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="Task title..."
                placeholderTextColor={Colors.textSecondary}
                autoFocus
                onSubmitEditing={handleAddTask}
                returnKeyType="done"
              />
              <TouchableOpacity 
                style={[styles.modalAddButton, !newTaskTitle.trim() && styles.modalAddButtonDisabled]} 
                onPress={handleAddTask}
                disabled={!newTaskTitle.trim()}
              >
                <Text style={styles.modalAddButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flexOne: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    ...Typography.sectionHeading,
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.sectionHeading,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  swipeableContainer: {
    marginBottom: Spacing.sm,
  },
  deleteAction: {
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
    width: 90,
    borderRadius: Radius.pill,
    marginLeft: Spacing.sm,
    height: '100%',
  },
  deleteActionText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    ...Shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.sectionHeading,
    color: Colors.textPrimary,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalAddButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  modalAddButtonDisabled: {
    backgroundColor: Colors.border,
  },
  modalAddButtonText: {
    color: '#FFFFFF',
    ...Typography.sectionHeading,
  },
});
