export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface PriorityOption {
  value: Priority;
  label: string;
  boxClass: string;
  hoverClass: string;
  activeClass: string;
}

export const PRIORITY_CONFIG: Record<Priority, PriorityOption> = {
  urgent: {
    value: 'urgent',
    label: 'Khẩn cấp',
    boxClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    hoverClass: 'hover:bg-rose-200 hover:border-rose-400',
    activeClass: 'bg-rose-100 text-rose-800 border-rose-500 ring-2 ring-rose-400 font-bold',
  },
  high: {
    value: 'high',
    label: 'Cao',
    boxClass: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
    hoverClass: 'hover:bg-orange-200 hover:border-orange-400',
    activeClass: 'bg-orange-100 text-orange-800 border-orange-500 ring-2 ring-orange-400 font-bold',
  },
  medium: {
    value: 'medium',
    label: 'Vừa',
    boxClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    hoverClass: 'hover:bg-amber-200 hover:border-amber-400',
    activeClass: 'bg-amber-100 text-amber-800 border-amber-500 ring-2 ring-amber-400 font-semibold',
  },
  low: {
    value: 'low',
    label: 'Thấp',
    boxClass: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
    hoverClass: 'hover:bg-slate-200 hover:border-slate-400',
    activeClass: 'bg-slate-100 text-slate-700 border-slate-500 ring-2 ring-slate-400 font-medium',
  },
};

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

export interface TaskComment {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_avatar?: string;
  content: string;
  created_at: string;
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
  comments?: TaskComment[];
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

