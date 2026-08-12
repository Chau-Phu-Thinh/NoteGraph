import { getDatabase } from './database';
import { Task, TaskList } from '../types';
import { generateId, now } from '../utils/helpers';

export async function getAllTaskLists(): Promise<TaskList[]> {
  const db = await getDatabase();
  return db.getAllAsync<TaskList>('SELECT * FROM task_lists ORDER BY created_at DESC');
}

export async function getTasksForList(listId: string): Promise<Task[]> {
  const db = await getDatabase();
  const tasks = await db.getAllAsync<any>(
    'SELECT * FROM tasks WHERE list_id = ? ORDER BY is_completed ASC, created_at ASC',
    [listId]
  );
  return tasks.map(t => ({ ...t, is_completed: Boolean(t.is_completed) }));
}

export async function createTask(listId: string, title: string): Promise<Task> {
  const db = await getDatabase();
  const id = generateId();
  const timestamp = now();
  await db.runAsync(
    'INSERT INTO tasks (id, list_id, title, is_completed, created_at, modified_at) VALUES (?, ?, ?, 0, ?, ?)',
    [id, listId, title.trim(), timestamp, timestamp]
  );
  return { id, list_id: listId, title: title.trim(), is_completed: false, created_at: timestamp, modified_at: timestamp };
}

export async function updateTask(id: string, title: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE tasks SET title = ?, modified_at = ? WHERE id = ?',
    [title.trim(), now(), id]
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function toggleTaskComplete(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE tasks SET is_completed = CASE WHEN is_completed = 0 THEN 1 ELSE 0 END, modified_at = ? WHERE id = ?',
    [now(), id]
  );
}

// Batch save: execute all pending task changes in a single transaction
export async function batchSaveTasks(
  creates: { listId: string; title: string; id: string }[],
  updates: { id: string; title: string }[],
  deletes: string[],
  toggles: string[]
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const timestamp = now();
    for (const c of creates) {
      await db.runAsync(
        'INSERT INTO tasks (id, list_id, title, is_completed, created_at, modified_at) VALUES (?, ?, ?, 0, ?, ?)',
        [c.id, c.listId, c.title.trim(), timestamp, timestamp]
      );
    }
    for (const u of updates) {
      await db.runAsync(
        'UPDATE tasks SET title = ?, modified_at = ? WHERE id = ?',
        [u.title.trim(), timestamp, u.id]
      );
    }
    for (const id of deletes) {
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    }
    for (const id of toggles) {
      await db.runAsync(
        'UPDATE tasks SET is_completed = CASE WHEN is_completed = 0 THEN 1 ELSE 0 END, modified_at = ? WHERE id = ?',
        [timestamp, id]
      );
    }
  });
}

export async function createTaskList(name: string): Promise<TaskList> {
  const db = await getDatabase();
  const id = generateId();
  const timestamp = now();
  await db.runAsync(
    'INSERT INTO task_lists (id, name, created_at, modified_at) VALUES (?, ?, ?, ?)',
    [id, name, timestamp, timestamp]
  );
  return { id, name, created_at: timestamp, modified_at: timestamp };
}
