import { getDatabase } from './database';
import { Tag } from '../types';
import { generateId } from '../utils/helpers';

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>('SELECT * FROM tags ORDER BY name ASC');
}

export async function getTagById(id: string): Promise<Tag | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Tag>('SELECT * FROM tags WHERE id = ?', [id]);
}

export async function createTag(name: string): Promise<Tag> {
  const db = await getDatabase();
  // Check for duplicate (case-insensitive)
  const existing = await db.getFirstAsync<Tag>(
    'SELECT * FROM tags WHERE LOWER(name) = LOWER(?)',
    [name.trim()]
  );
  if (existing) {
    throw new Error('A tag with this name already exists');
  }
  const id = generateId();
  await db.runAsync('INSERT INTO tags (id, name) VALUES (?, ?)', [id, name.trim()]);
  return { id, name: name.trim() };
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDatabase();
  // note_tags entries cascade-deleted automatically
  await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
}

export async function assignTagToNote(noteId: string, tagId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
    [noteId, tagId]
  );
}

export async function unassignTagFromNote(noteId: string, tagId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?',
    [noteId, tagId]
  );
}
