import { getDatabase } from './database';
import { Note, Tag, NoteLink } from '../types';
import { generateId, now } from '../utils/helpers';

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDatabase();
  const notes = await db.getAllAsync<Note>('SELECT * FROM notes ORDER BY modified_at DESC');
  // Attach tags to each note
  for (const note of notes) {
    note.tags = await getTagsForNote(note.id);
  }
  return notes;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const db = await getDatabase();
  const note = await db.getFirstAsync<Note>('SELECT * FROM notes WHERE id = ?', [id]);
  if (note) {
    note.tags = await getTagsForNote(note.id);
    note.links = await getLinksForNote(note.id);
  }
  return note;
}

export async function createNote(title: string, content: string, tagIds?: string[]): Promise<Note> {
  const db = await getDatabase();
  const id = generateId();
  const timestamp = now();
  await db.runAsync(
    'INSERT INTO notes (id, title, content, created_at, modified_at) VALUES (?, ?, ?, ?, ?)',
    [id, title.trim(), content, timestamp, timestamp]
  );
  if (tagIds && tagIds.length > 0) {
    for (const tagId of tagIds) {
      await db.runAsync('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }
  const note = await getNoteById(id);
  return note!;
}

export async function updateNote(id: string, title: string, content: string, tagIds?: string[]): Promise<Note> {
  const db = await getDatabase();
  const timestamp = now();
  await db.runAsync(
    'UPDATE notes SET title = ?, content = ?, modified_at = ? WHERE id = ?',
    [title.trim(), content, timestamp, id]
  );
  // Update tags: remove all, then re-add
  if (tagIds !== undefined) {
    await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', [id]);
    for (const tagId of tagIds) {
      await db.runAsync('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }
  const note = await getNoteById(id);
  return note!;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

export async function searchNotes(keyword: string): Promise<Note[]> {
  const db = await getDatabase();
  const query = `%${keyword}%`;
  const notes = await db.getAllAsync<Note>(
    `SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY modified_at DESC`,
    [query, query]
  );
  for (const note of notes) {
    note.tags = await getTagsForNote(note.id);
  }
  return notes;
}

export async function getTagsForNote(noteId: string): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>(
    'SELECT t.* FROM tags t INNER JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?',
    [noteId]
  );
}

export async function getLinksForNote(noteId: string): Promise<NoteLink[]> {
  const db = await getDatabase();
  return db.getAllAsync<NoteLink>(
    'SELECT * FROM note_links WHERE source_id = ? OR target_id = ?',
    [noteId, noteId]
  );
}

export async function createNoteLink(sourceId: string, targetId: string): Promise<void> {
  if (sourceId === targetId) return; // BR-05.1: no self-links
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO note_links (source_id, target_id) VALUES (?, ?)',
    [sourceId, targetId]
  );
}

export async function deleteNoteLink(sourceId: string, targetId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM note_links WHERE source_id = ? AND target_id = ?',
    [sourceId, targetId]
  );
}

export async function getAllNotesWithLinks(): Promise<{ notes: Note[]; links: NoteLink[] }> {
  const db = await getDatabase();
  const notes = await db.getAllAsync<Note>('SELECT * FROM notes');
  for (const note of notes) {
    note.tags = await getTagsForNote(note.id);
  }
  const links = await db.getAllAsync<NoteLink>('SELECT * FROM note_links');
  return { notes, links };
}

export async function getNotesByTitle(title: string): Promise<Note[]> {
  const db = await getDatabase();
  return db.getAllAsync<Note>(
    'SELECT * FROM notes WHERE LOWER(title) LIKE LOWER(?)',
    [`%${title}%`]
  );
}
