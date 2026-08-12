export interface TaskList {
  id: string;
  name: string;
  created_at: number;
  modified_at: number;
}

export interface Task {
  id: string;
  list_id: string;
  title: string;
  is_completed: boolean;
  created_at: number;
  modified_at: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id?: string;
  created_at: number;
  modified_at: number;
  tags?: Tag[];
  links?: NoteLink[];
}

export interface Tag {
  id: string;
  name: string;
}

export interface NoteTag {
  note_id: string;
  tag_id: string;
}

export interface NoteLink {
  source_id: string;
  target_id: string;
}

export type FilterType = 'All' | 'Work' | 'Personal';

export interface PendingChange {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE';
  entity: 'task' | 'note' | 'tag';
  data: any;
  id: string;
}
