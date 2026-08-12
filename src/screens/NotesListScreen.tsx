import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { FilterType, Note, Task } from '../types';
import { Colors, Spacing, Radius, Typography, Shadows } from '../theme/tokens';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import FilterChips from '../components/FilterChips';
import NoteCard from '../components/NoteCard';
import FAB from '../components/FAB';
import EmptyState from '../components/EmptyState';
import TaskItem from '../components/TaskItem';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'NotesList'>;

const FILTER_OPTIONS: FilterType[] = ['All', 'Work', 'Personal'];

export default function NotesListScreen({ navigation }: Props) {
  const { notes, loadingNotes, refreshNotes, deleteNote, taskLists, tasks, saveTaskChanges } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('All');

  // Refresh notes when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshNotes();
    }, [refreshNotes])
  );

  // Filter notes based on selected filter tag
  const filteredNotes = useMemo(() => {
    if (selectedFilter === 'All') {
      return notes;
    }
    return notes.filter((note) =>
      note.tags?.some((tag) => tag.name.toLowerCase() === selectedFilter.toLowerCase())
    );
  }, [notes, selectedFilter]);

  // Handle note deletion with confirmation dialog
  const handleNoteLongPress = useCallback(
    (note: Note) => {
      Alert.alert(
        'Delete Note',
        `Are you sure you want to delete "${note.title || 'Untitled'}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteNote(note.id);
              } catch (error) {
                Alert.alert('Error', 'Failed to delete note');
              }
            },
          },
        ]
      );
    },
    [deleteNote]
  );

  const handleNotePress = useCallback(
    (note: Note) => {
      navigation.navigate('NoteEditor', { noteId: note.id, mode: 'view' });
    },
    [navigation]
  );

  const handleToggleTask = useCallback(
    async (task: Task) => {
      try {
        await saveTaskChanges([], [], [], [task.id]);
      } catch (error) {
        console.error('Failed to toggle task:', error);
      }
    },
    [saveTaskChanges]
  );

  const navigateToTasks = useCallback(() => {
    // Tasks is a sibling drawer route, not a screen in the notes stack.
    navigation.getParent()?.navigate('TasksStack');
  }, [navigation]);

  const hasTaskSection = (taskLists && taskLists.length > 0) || (tasks && tasks.length > 0);
  const completedTasksCount = tasks.filter((t) => t.is_completed).length;

  const renderHeader = () => (
    <View style={styles.topContainer}>
      {/* Search Bar - Navigates to Search Screen on Press/Focus */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value=""
          onChangeText={() => {}}
          placeholder="Search notes..."
          onPress={() => navigation.navigate('Search')}
          onFocus={() => navigation.navigate('Search')}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <FilterChips
          chips={FILTER_OPTIONS}
          selected={selectedFilter}
          onSelect={(chip) => setSelectedFilter(chip as FilterType)}
        />
      </View>

      {/* Daily Tasks Card */}
      {hasTaskSection && (
        <TouchableOpacity
          style={styles.dailyTasksCard}
          onPress={navigateToTasks}
          activeOpacity={0.9}
        >
          <View style={styles.dailyTasksHeader}>
            <View style={styles.dailyTasksTitleRow}>
              <MaterialCommunityIcons
                name="checkbox-marked-circle-outline"
                size={22}
                color={Colors.primary}
              />
              <Text style={styles.dailyTasksTitle}>
                {taskLists[0]?.name || 'Daily Tasks'}
              </Text>
            </View>
            <View style={styles.dailyTasksRightRow}>
              {tasks.length > 0 && (
                <Text style={styles.dailyTasksCount}>
                  {completedTasksCount}/{tasks.length}
                </Text>
              )}
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.textSecondary}
              />
            </View>
          </View>

          {tasks.length > 0 ? (
            <View style={styles.tasksList}>
              {tasks.slice(0, 3).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  onPress={navigateToTasks}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyTasksText}>No tasks for today. Tap to add tasks.</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Notes</Text>
        <Text style={styles.sectionCount}>
          {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Screen Header */}
      <Header
        title="My Notes"
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      />

      {/* Main List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={handleNotePress}
            onLongPress={handleNoteLongPress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loadingNotes ? (
            <EmptyState
              icon="note-text-outline"
              title="No notes found"
              subtitle={
                selectedFilter === 'All'
                  ? 'Tap the + button below to create your first note.'
                  : `No notes found with tag "${selectedFilter}".`
              }
            />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loadingNotes}
            onRefresh={refreshNotes}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      />

      {/* Floating Action Button */}
      <FAB onPress={() => navigation.navigate('NoteEditor', { mode: 'create' })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 90, // Extra padding for FAB
  },
  topContainer: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  searchWrapper: {
    marginBottom: Spacing.md,
  },
  filterWrapper: {
    marginBottom: Spacing.lg,
  },
  dailyTasksCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  dailyTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  dailyTasksTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dailyTasksTitle: {
    ...Typography.sectionHeading,
    color: Colors.textPrimary,
  },
  dailyTasksRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dailyTasksCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginRight: 2,
  },
  tasksList: {
    gap: Spacing.sm,
  },
  emptyTasksText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.sectionHeading,
    color: Colors.textPrimary,
  },
  sectionCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
