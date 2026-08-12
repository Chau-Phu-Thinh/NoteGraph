import * as SQLite from 'expo-sqlite';

const DB_NAME = 'notegraph.db';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    try {
      // Fast check to see if JSI binding is dead (e.g. from Fast Refresh).
      // If the native binding is invalid/closed, this throws an error.
      db.isInTransactionSync();
    } catch (e) {
      // Binding is dead. Drop it.
      db = null;
      dbPromise = null;
    }
  }

  if (db) return db;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
      // Force a new connection to avoid getting a dead native object from Expo's internal cache
      const database = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
      await database.execAsync('PRAGMA foreign_keys = ON;');
      await database.execAsync('PRAGMA journal_mode = WAL;');
      await initDatabase(database);
      db = database;
      return database;
    } catch (e) {
      dbPromise = null;
      db = null;
      throw e;
    }
  })();

  return dbPromise;
}

async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS task_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      title TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL,
      FOREIGN KEY (list_id) REFERENCES task_lists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      folder_id TEXT,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS note_links (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      PRIMARY KEY (source_id, target_id),
      FOREIGN KEY (source_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(is_completed ASC, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_notes_modified ON notes(modified_at DESC);
  `);

  // Seed default task list if none exists
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM task_lists');
  if (result && result.count === 0) {
    const { generateId, now } = require('../utils/helpers');
    const timestamp = now();
    await db.runAsync(
      'INSERT INTO task_lists (id, name, created_at, modified_at) VALUES (?, ?, ?, ?)',
      [generateId(), 'Daily Tasks', timestamp, timestamp]
    );
  }
}

export async function closeDatabase(): Promise<void> {
  if (dbPromise && !db) {
    try {
      await dbPromise;
    } catch {
      // ignore
    }
  }
  if (db) {
    await db.closeAsync();
    db = null;
  }
  dbPromise = null;
}
