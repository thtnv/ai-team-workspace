export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at?: string;
}

export interface WorkspaceMember {
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'member' | 'viewer';
  avatar_url?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  members: WorkspaceMember[];
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  color: string;
}

export interface Board {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  columns: Column[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  is_done: boolean;
}

export interface Task {
  id: string;
  board_id: string;
  workspace_id?: string;
  column_id: string;
  title: string;
  description?: string;
  priority: Priority;
  order: number;
  assignees: string[];
  tags: string[];
  due_date?: string | null;
  checklists: Subtask[];
  ai_generated?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  action: string;
  assignee_name?: string;
  suggested_priority: Priority;
  is_converted_to_task: boolean;
  task_id?: string | null;
}

export interface NoteSummary {
  overview: string;
  key_decisions: string[];
  action_items: ActionItem[];
}

export interface Note {
  id: string;
  workspace_id: string;
  title: string;
  raw_content: string;
  summary?: NoteSummary | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PresenceUser {
  sid: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface TaskBreakdownResponse {
  summary: string;
  tasks: {
    title: string;
    description: string;
    priority: Priority;
    estimated_hours: number;
    tags: string[];
    checklists: { title: string }[];
  }[];
}

