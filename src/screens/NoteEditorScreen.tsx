import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import TagChip from '../components/TagChip';
import { Colors, Spacing, Radius, Typography, Shadows } from '../theme/tokens';
import { formatDateTime, extractWikiLinks, generateId } from '../utils/helpers';
import type { Note, Tag } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteEditor'>;

export default function NoteEditorScreen({ route, navigation }: Props) {
  const noteId = route.params?.noteId;
  const initialMode = route.params?.mode || 'create';

  const {
    getNoteById,
    createNote,
    updateNote,
    deleteNote,
    tags: availableTags,
    createTag,
    deleteTag,
    getNotesByTitle,
    createNoteLink,
    notes: allNotes,
    tasks,
    taskLists,
    saveTaskChanges,
  } = useApp();

  // Local State
  const [activeNoteId, setActiveNoteId] = useState<string | undefined>(noteId);
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>(initialMode);
  const [loading, setLoading] = useState<boolean>(!!noteId);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
  const [modifiedAt, setModifiedAt] = useState<number>(Date.now());
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Selection state for cursor tracking & wiki links
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [wikiQuery, setWikiQuery] = useState<string>('');
  const [showWikiSuggestions, setShowWikiSuggestions] = useState<boolean>(false);

  // Tag Modal State
  const [tagModalVisible, setTagModalVisible] = useState<boolean>(false);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');

  // Refs for callbacks & input focus
  const bodyInputRef = useRef<TextInput>(null);
  const isDirtyRef = useRef<boolean>(false);
  const handleSaveRef = useRef<() => Promise<boolean>>(async () => false);

  // Sync ref
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Load Note Data if noteId is provided
  useEffect(() => {
    if (noteId) {
      let isMounted = true;
      (async () => {
        try {
          setLoading(true);
          const note = await getNoteById(noteId);
          if (note && isMounted) {
            setTitle(note.title);
            setContent(note.content);
            setSelectedTags(note.tags || []);
            setCreatedAt(note.created_at);
            setModifiedAt(note.modified_at);
            setIsDirty(false);
            isDirtyRef.current = false;
          }
        } catch (error) {
          console.error('Error loading note:', error);
          Alert.alert('Error', 'Failed to load note details.');
        } finally {
          if (isMounted) setLoading(false);
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [noteId, getNoteById]);

  // Handle Save
  const handleSave = useCallback(async (): Promise<boolean> => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Validation', 'Please enter a title for the note.');
      return false;
    }

    try {
      const tagIds = selectedTags.map((t) => t.id);
      let activeId = activeNoteId;

      if (mode === 'create' || !activeId) {
        const created = await createNote(trimmedTitle, content, tagIds);
        activeId = created.id;
        setActiveNoteId(activeId);
      } else {
        await updateNote(activeId, trimmedTitle, content, tagIds);
      }

      // Process Wiki Links
      const wikiTitles = extractWikiLinks(content);
      if (wikiTitles.length > 0 && activeId) {
        for (const linkTitle of wikiTitles) {
          const matchingNotes = await getNotesByTitle(linkTitle);
          if (matchingNotes && matchingNotes.length > 0) {
            for (const targetNote of matchingNotes) {
              if (targetNote.id !== activeId) {
                await createNoteLink(activeId, targetNote.id);
              }
            }
          }
        }
      }

      // Process Tasks
      if (taskLists && taskLists.length > 0) {
        const defaultListId = taskLists[0].id;
        const taskRegex = /^- \[(.*?)\](.*)$/gm;
        let match;
        const creates: { listId: string; title: string; id: string }[] = [];
        const toggles: string[] = [];
        const taskMap = new Map(tasks.map((t) => [t.title.trim().toLowerCase(), t]));
        
        while ((match = taskRegex.exec(content)) !== null) {
          const insideBrackets = match[1].trim();
          const afterBrackets = match[2].trim();
          
          let isCompleted = false;
          let titleStr = '';
          
          if (insideBrackets.toLowerCase() === 'x' || insideBrackets === '') {
             isCompleted = insideBrackets.toLowerCase() === 'x';
             titleStr = afterBrackets;
          } else {
             titleStr = insideBrackets;
             if (afterBrackets) titleStr += ' ' + afterBrackets;
          }
          
          if (!titleStr) continue;
          
          const titleKey = titleStr.toLowerCase();
          const existing = taskMap.get(titleKey);
          
          if (!existing) {
             const newId = generateId();
             creates.push({
               listId: defaultListId,
               title: titleStr,
               id: newId
             });
             taskMap.set(titleKey, {
               id: newId,
               list_id: defaultListId,
               title: titleStr,
               is_completed: isCompleted,
               created_at: Date.now(),
               modified_at: Date.now(),
             });
             if (isCompleted) {
                toggles.push(newId);
             }
          } else {
             if (existing.is_completed !== isCompleted) {
                toggles.push(existing.id);
                existing.is_completed = isCompleted;
             }
          }
        }
        
        if (creates.length > 0 || toggles.length > 0) {
          await saveTaskChanges(creates, [], [], toggles);
        }
      }

      setIsDirty(false);
      isDirtyRef.current = false;
      setMode('view');
      setModifiedAt(Date.now());
      Alert.alert('Saved', 'Note saved successfully.');
      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
      return false;
    }
  }, [title, content, selectedTags, mode, activeNoteId, createNote, updateNote, getNotesByTitle, createNoteLink, tasks, taskLists, saveTaskChanges]);

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Handle Unsaved Changes via Navigation beforeRemove listener
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isDirtyRef.current) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to discard them or keep editing?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
          {
            text: 'Save',
            onPress: async () => {
              const success = await handleSaveRef.current();
              if (success) {
                navigation.dispatch(e.data.action);
              }
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation]);

  // Header Back Arrow Press
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Delete Note Handler
  const handleDeleteNote = () => {
    if (!activeNoteId) return;
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(activeNoteId);
              setIsDirty(false);
              isDirtyRef.current = false;
              navigation.goBack();
            } catch (err) {
              console.error('Error deleting note:', err);
              Alert.alert('Error', 'Failed to delete note.');
            }
          },
        },
      ]
    );
  };

  // Text changes
  const handleTitleChange = (text: string) => {
    setTitle(text);
    setIsDirty(true);
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    setIsDirty(true);

    // Check for Wiki Link trigger `[[` before cursor
    const cursor = selection.start;
    const textBeforeCursor = text.substring(0, cursor);
    const match = textBeforeCursor.match(/\[\[([^\]\n]*)$/);
    if (match) {
      setWikiQuery(match[1]);
      setShowWikiSuggestions(true);
    } else {
      setShowWikiSuggestions(false);
    }
  };

  const handleSelectionChange = (e: any) => {
    const sel = e.nativeEvent.selection;
    setSelection(sel);

    // Also update wiki link suggestion context based on new cursor
    const textBeforeCursor = content.substring(0, sel.start);
    const match = textBeforeCursor.match(/\[\[([^\]\n]*)$/);
    if (match) {
      setWikiQuery(match[1]);
      setShowWikiSuggestions(true);
    } else {
      setShowWikiSuggestions(false);
    }
  };

  // Select Wiki Suggestion
  const handleSelectWikiSuggestion = (targetNote: Note) => {
    const textBeforeCursor = content.substring(0, selection.start);
    const matchIndex = textBeforeCursor.lastIndexOf('[[');
    if (matchIndex !== -1) {
      const newTextBefore = textBeforeCursor.substring(0, matchIndex) + `[[${targetNote.title}]] `;
      const textAfterCursor = content.substring(selection.start);
      const newContent = newTextBefore + textAfterCursor;
      setContent(newContent);
      setIsDirty(true);
      const newPos = newTextBefore.length;
      setSelection({ start: newPos, end: newPos });
    }
    setShowWikiSuggestions(false);
  };

  // Formatting Toolbar Action
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (mode === 'view') {
      setMode('edit');
    }
    const start = selection.start;
    const end = selection.end;
    const selectedText = content.substring(start, end);
    const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setIsDirty(true);

    const newStart = start + prefix.length;
    const newEnd = selectedText ? start + prefix.length + selectedText.length : newStart;
    setSelection({ start: newStart, end: newEnd });

    setTimeout(() => {
      bodyInputRef.current?.focus();
    }, 50);
  };

  // Tag Operations
  const handleToggleTag = (tag: Tag) => {
    const exists = selectedTags.some((t) => t.id === tag.id);
    if (exists) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    setIsDirty(true);
  };

  const handleRemoveTag = (tag: Tag) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    setIsDirty(true);
  };

  const handleDeleteTagPrompt = (tag: Tag) => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete the tag "${tag.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTag(tag.id);
              setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id));
              setIsDirty(true);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete tag.');
            }
          },
        },
      ]
    );
  };

  const handleCreateNewTag = async () => {
    const trimmed = tagSearchQuery.trim();
    if (!trimmed) return;
    try {
      const newTag = await createTag(trimmed);
      setSelectedTags((prev) => [...prev, newTag]);
      setTagSearchQuery('');
      setIsDirty(true);
    } catch (err: any) {
      Alert.alert('Tag Error', err.message || 'Could not create tag.');
    }
  };

  // Filter Notes for Wiki Suggestions
  const filteredNoteSuggestions = allNotes.filter(
    (n) => n.id !== activeNoteId && n.title.toLowerCase().includes(wikiQuery.toLowerCase())
  );

  // Filter Tags for Tag Modal
  const filteredTags = availableTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearchQuery.trim().toLowerCase())
  );
  const tagExists = availableTags.some(
    (t) => t.name.toLowerCase() === tagSearchQuery.trim().toLowerCase()
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const headerTitle =
    mode === 'create'
      ? 'New Note'
      : title.trim().length > 0
      ? title.trim()
      : 'Untitled Note';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header
        title={headerTitle}
        onBackPress={handleBackPress}
        rightAction={
          <View style={styles.headerRightActions}>
            {activeNoteId && (
              <TouchableOpacity onPress={handleDeleteNote} style={styles.deleteIconButton}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Editor Content Area */}
      <ScrollView
        style={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Input */}
        <Pressable
          onPress={() => {
            if (mode === 'view') setMode('edit');
          }}
          style={styles.titleWrapper}
        >
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Note Title"
            placeholderTextColor={Colors.textSecondary}
            editable={mode !== 'view'}
            pointerEvents={mode === 'view' ? 'none' : 'auto'}
            multiline={false}
          />
        </Pressable>

        {/* Date / Time Metadata */}
        <Text style={styles.metadataText}>
          {mode === 'create'
            ? `Created: ${formatDateTime(createdAt)}`
            : `Last modified: ${formatDateTime(modifiedAt)}`}
        </Text>

        {/* Inline Tags Section */}
        <View style={styles.tagsContainer}>
          {selectedTags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              onRemove={mode !== 'view' ? () => handleRemoveTag(tag) : undefined}
            />
          ))}

          {mode !== 'view' && (
            <TouchableOpacity
              style={styles.addTagChip}
              onPress={() => setTagModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus" size={14} color={Colors.primary} />
              <Text style={styles.addTagChipText}>Add Tag</Text>
            </TouchableOpacity>
          )}

          {mode === 'view' && selectedTags.length === 0 && (
            <Text style={styles.noTagsText}>No tags assigned</Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body Input */}
        <Pressable
          onPress={() => {
            if (mode === 'view') setMode('edit');
          }}
          style={styles.bodyWrapper}
        >
          <TextInput
            ref={bodyInputRef}
            style={styles.bodyInput}
            value={content}
            onChangeText={handleContentChange}
            onSelectionChange={handleSelectionChange}
            selection={selection}
            placeholder="Start typing your note here... Type [[ to link notes."
            placeholderTextColor={Colors.textSecondary}
            editable={mode !== 'view'}
            pointerEvents={mode === 'view' ? 'none' : 'auto'}
            multiline
            textAlignVertical="top"
          />
        </Pressable>
      </ScrollView>

      {/* Wiki Link Suggestion Overlay */}
      {showWikiSuggestions && filteredNoteSuggestions.length > 0 && (
        <View style={styles.wikiSuggestionsBox}>
          <View style={styles.wikiSuggestionsHeader}>
            <MaterialCommunityIcons name="link-variant" size={16} color={Colors.primary} />
            <Text style={styles.wikiSuggestionsHeaderText}>Link to Note</Text>
          </View>
          <FlatList
            data={filteredNoteSuggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.wikiItem}
                onPress={() => handleSelectWikiSuggestion(item)}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.wikiItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 160 }}
          />
        </View>
      )}

      {/* Bottom Formatting Toolbar */}
      <View style={styles.toolbarContainer}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => insertFormatting('**', '**')}
        >
          <MaterialCommunityIcons name="format-bold" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => insertFormatting('*', '*')}
        >
          <MaterialCommunityIcons name="format-italic" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => insertFormatting('\n# ')}
        >
          <MaterialCommunityIcons name="format-header-pound" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => insertFormatting('\n- ')}
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => insertFormatting('\n- [ ] ')}
        >
          <MaterialCommunityIcons name="checkbox-marked-outline" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => insertFormatting('[[', ']]')}
        >
          <MaterialCommunityIcons name="link-variant" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => {
            if (mode === 'view') setMode('edit');
            setTagModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="tag-plus-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      </SafeAreaView>

      {/* Tag Selection Modal */}
      <Modal
        visible={tagModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTagModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Tags</Text>
              <TouchableOpacity onPress={() => setTagModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Tag Search / Creation Input */}
            <View style={styles.modalSearchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search or create tag..."
                placeholderTextColor={Colors.textSecondary}
                value={tagSearchQuery}
                onChangeText={setTagSearchQuery}
              />
              {tagSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setTagSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={Colors.iconInactive} />
                </TouchableOpacity>
              )}
            </View>

            {/* Available Tags List */}
            <FlatList
              data={filteredTags}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              renderItem={({ item }) => {
                const isSelected = selectedTags.some((t) => t.id === item.id);
                return (
                  <View style={styles.modalTagItem}>
                    <TouchableOpacity
                      style={styles.modalTagItemLeft}
                      onPress={() => handleToggleTag(item)}
                    >
                      <MaterialCommunityIcons
                        name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={22}
                        color={isSelected ? Colors.primary : Colors.iconInactive}
                      />
                      <Text style={styles.modalTagText}>#{item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteTagButton}
                      onPress={() => handleDeleteTagPrompt(item)}
                    >
                      <MaterialCommunityIcons name="close" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                !tagExists && tagSearchQuery.trim().length > 0 ? null : (
                  <Text style={styles.modalEmptyText}>No tags found</Text>
                )
              }
            />

            {/* Create Tag Option */}
            {tagSearchQuery.trim().length > 0 && !tagExists && (
              <TouchableOpacity
                style={styles.createTagButton}
                onPress={handleCreateNewTag}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.createTagButtonText}>
                  Create "#{tagSearchQuery.trim()}"
                </Text>
              </TouchableOpacity>
            )}

            {/* Done Button */}
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setTagModalVisible(false)}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIconButton: {
    padding: 8,
    marginRight: 4,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  titleWrapper: {
    marginBottom: Spacing.xs,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  metadataText: {
    ...Typography.metadata,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.xs,
  },
  addTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryUltralight,
    borderRadius: Radius.md,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  addTagChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  noTagsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  bodyWrapper: {
    flex: 1,
    minHeight: 300,
  },
  bodyInput: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
    minHeight: 280,
    textAlignVertical: 'top',
  },
  // Wiki Link Suggestions Overlay
  wikiSuggestionsBox: {
    position: 'absolute',
    bottom: 60,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 1000,
  },
  wikiSuggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryUltralight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  wikiSuggestionsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  wikiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.chipDefaultBg,
  },
  wikiItemTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  // Bottom Formatting Toolbar
  toolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  toolbarButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  // Tag Selection Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.screenPadding,
    maxHeight: '80%',
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
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.chipDefaultBg,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: Spacing.md,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 6,
  },
  modalList: {
    maxHeight: 220,
    marginBottom: Spacing.md,
  },
  modalTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.chipDefaultBg,
  },
  modalTagItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteTagButton: {
    padding: 4,
  },
  modalTagText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  modalEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
  },
  createTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  createTagButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalDoneButton: {
    backgroundColor: Colors.chipDefaultBg,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
