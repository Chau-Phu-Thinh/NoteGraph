import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { Note, Task, TaskList, Tag } from '../types';
import * as noteRepo from '../database/noteRepo';
import * as taskRepo from '../database/taskRepo';
import * as tagRepo from '../database/tagRepo';
import { getDatabase } from '../database/database';
import { generateId } from '../utils/helpers';

interface AppState {
  // Notes
  notes: Note[];
  loadingNotes: boolean;
  refreshNotes: () => Promise<void>;
  createNote: (title: string, content: string, tagIds?: string[]) => Promise<Note>;
  updateNote: (id: string, title: string, content: string, tagIds?: string[]) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  searchNotes: (keyword: string) => Promise<Note[]>;
  getNoteById: (id: string) => Promise<Note | null>;
  getNotesByTitle: (title: string) => Promise<Note[]>;
  createNoteLink: (sourceId: string, targetId: string) => Promise<void>;
  getAllNotesWithLinks: () => Promise<{ notes: Note[]; links: any[] }>;

  // Tasks
  taskLists: TaskList[];
  tasks: Task[];
  loadingTasks: boolean;
  refreshTasks: () => Promise<void>;
  pendingTaskChanges: boolean;
  setPendingTaskChanges: (v: boolean) => void;
  localTasks: Task[];
  setLocalTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  saveTaskChanges: (
    creates: { listId: string; title: string; id: string }[],
    updates: { id: string; title: string }[],
    deletes: string[],
    toggles: string[]
  ) => Promise<void>;

  // Tags
  tags: Tag[];
  refreshTags: () => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  assignTag: (noteId: string, tagId: string) => Promise<void>;
  unassignTag: (noteId: string, tagId: string) => Promise<void>;

  // DB init
  dbReady: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dbReady, setDbReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pendingTaskChanges, setPendingTaskChanges] = useState(false);

  // Initialize database
  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
        setDbReady(true);
      } catch (error) {
        console.error('Failed to init database:', error);
        Alert.alert('Error', 'Failed to initialize database. Please restart the app.');
      }
    })();
  }, []);

  // Load data when DB is ready
  useEffect(() => {
    if (dbReady) {
      refreshNotes();
      refreshTasks();
      refreshTags();
    }
  }, [dbReady]);

  const refreshNotes = useCallback(async () => {
    try {
      setLoadingNotes(true);
      const data = await noteRepo.getAllNotes();
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const lists = await taskRepo.getAllTaskLists();
      setTaskLists(lists);
      if (lists.length > 0) {
        const t = await taskRepo.getTasksForList(lists[0].id);
        setTasks(t);
        setLocalTasks(t);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const refreshTags = useCallback(async () => {
    try {
      const data = await tagRepo.getAllTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, []);

  const handleCreateNote = useCallback(async (title: string, content: string, tagIds?: string[]) => {
    const note = await noteRepo.createNote(title, content, tagIds);
    await refreshNotes();
    return note;
  }, [refreshNotes]);

  const handleUpdateNote = useCallback(async (id: string, title: string, content: string, tagIds?: string[]) => {
    const note = await noteRepo.updateNote(id, title, content, tagIds);
    await refreshNotes();
    return note;
  }, [refreshNotes]);

  const handleDeleteNote = useCallback(async (id: string) => {
    await noteRepo.deleteNote(id);
    await refreshNotes();
  }, [refreshNotes]);

  const handleSearchNotes = useCallback(async (keyword: string) => {
    return noteRepo.searchNotes(keyword);
  }, []);

  const handleGetNoteById = useCallback(async (id: string) => {
    return noteRepo.getNoteById(id);
  }, []);

  const handleGetNotesByTitle = useCallback(async (title: string) => {
    return noteRepo.getNotesByTitle(title);
  }, []);

  const handleCreateNoteLink = useCallback(async (sourceId: string, targetId: string) => {
    await noteRepo.createNoteLink(sourceId, targetId);
  }, []);

  const handleGetAllNotesWithLinks = useCallback(async () => {
    return noteRepo.getAllNotesWithLinks();
  }, []);

  const handleCreateTag = useCallback(async (name: string) => {
    const tag = await tagRepo.createTag(name);
    await refreshTags();
    return tag;
  }, [refreshTags]);

  const handleDeleteTag = useCallback(async (id: string) => {
    await tagRepo.deleteTag(id);
    await refreshTags();
    await refreshNotes(); // tags on notes may have changed
  }, [refreshTags, refreshNotes]);

  const handleAssignTag = useCallback(async (noteId: string, tagId: string) => {
    await tagRepo.assignTagToNote(noteId, tagId);
  }, []);

  const handleUnassignTag = useCallback(async (noteId: string, tagId: string) => {
    await tagRepo.unassignTagFromNote(noteId, tagId);
  }, []);

  const handleSaveTaskChanges = useCallback(async (
    creates: { listId: string; title: string; id: string }[],
    updates: { id: string; title: string }[],
    deletes: string[],
    toggles: string[]
  ) => {
    await taskRepo.batchSaveTasks(creates, updates, deletes, toggles);
    setPendingTaskChanges(false);
    await refreshTasks();
  }, [refreshTasks]);

  const value: AppState = {
    notes,
    loadingNotes,
    refreshNotes,
    createNote: handleCreateNote,
    updateNote: handleUpdateNote,
    deleteNote: handleDeleteNote,
    searchNotes: handleSearchNotes,
    getNoteById: handleGetNoteById,
    getNotesByTitle: handleGetNotesByTitle,
    createNoteLink: handleCreateNoteLink,
    getAllNotesWithLinks: handleGetAllNotesWithLinks,
    taskLists,
    tasks,
    loadingTasks,
    refreshTasks,
    pendingTaskChanges,
    setPendingTaskChanges,
    localTasks,
    setLocalTasks,
    saveTaskChanges: handleSaveTaskChanges,
    tags,
    refreshTags,
    createTag: handleCreateTag,
    deleteTag: handleDeleteTag,
    assignTag: handleAssignTag,
    unassignTag: handleUnassignTag,
    dbReady,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
