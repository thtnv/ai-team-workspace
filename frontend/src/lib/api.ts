import {
  User,
  Workspace,
  Board,
  Task,
  Note,
  TaskBreakdownResponse,
  NoteSummary,
  ActionItem,
  Priority
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('syncpulse_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('syncpulse_token', token);
      } else {
        localStorage.removeItem('syncpulse_token');
      }
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('syncpulse_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(errorData.detail || `HTTP Error ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(email: string, full_name: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await this.request<{ access_token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, full_name, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  // Workspaces
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>('/api/workspaces');
  }

  async getWorkspaceBoards(workspaceId: string): Promise<Board[]> {
    return this.request<Board[]>(`/api/workspaces/${workspaceId}/boards`);
  }

  // Boards & Tasks
  async getBoard(boardId: string): Promise<Board> {
    return this.request<Board>(`/api/boards/${boardId}`);
  }

  async getBoardTasks(boardId: string): Promise<Task[]> {
    return this.request<Task[]>(`/api/boards/${boardId}/tasks`);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    return this.request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async moveTask(payload: {
    task_id: string;
    board_id: string;
    source_col_id: string;
    dest_col_id: string;
    new_order: number;
  }): Promise<any> {
    return this.request('/api/tasks/move', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteTask(taskId: string): Promise<any> {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Notes
  async getNotes(workspaceId: string): Promise<Note[]> {
    return this.request<Note[]>(`/api/notes?workspace_id=${workspaceId}`);
  }

  async createNote(note: { workspace_id: string; title: string; raw_content: string }): Promise<Note> {
    return this.request<Note>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  async updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
    return this.request<Note>(`/api/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNote(noteId: string): Promise<any> {
    return this.request(`/api/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // AI Features
  async breakdownTask(prompt: string, workspaceId?: string, boardId?: string): Promise<TaskBreakdownResponse> {
    return this.request<TaskBreakdownResponse>('/api/ai/breakdown-task', {
      method: 'POST',
      body: JSON.stringify({ prompt, workspace_id: workspaceId, board_id: boardId }),
    });
  }

  async summarizeNotes(rawContent: string, workspaceId?: string, noteId?: string): Promise<NoteSummary> {
    return this.request<NoteSummary>('/api/ai/summarize-notes', {
      method: 'POST',
      body: JSON.stringify({ raw_content: rawContent, workspace_id: workspaceId, note_id: noteId }),
    });
  }

  async convertActionToTask(payload: {
    workspace_id: string;
    board_id: string;
    column_id: string;
    action_item: ActionItem;
  }): Promise<Task> {
    return this.request<Task>('/api/ai/convert-action-to-task', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();

