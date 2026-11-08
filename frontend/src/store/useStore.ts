import { create } from 'zustand';
import { User, Workspace, Board, Task, Note, PresenceUser } from '@/types';

interface AppState {
  // Auth & Core Context
  currentUser: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  boards: Board[];
  currentBoard: Board | null;

  // Board Data
  tasks: Task[];
  notes: Note[];
  activePresenceUsers: PresenceUser[];
  lockedTasks: Record<string, string>; // taskId -> userName

  // Modals state
  isAIBreakdownOpen: boolean;
  isAINotesOpen: boolean;
  isCreateTaskOpen: boolean;
  selectedColumnForCreate: string | null;
  selectedTaskForDetail: Task | null;
  isLoginModalOpen: boolean;

  // Actions
  setCurrentUser: (user: User | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board: Board | null) => void;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;

  // Optimistic Move & Rollback
  moveTaskOptimistic: (taskId: string, destColId: string, newOrder: number) => void;
  revertTaskMove: (taskId: string, originalColId: string, originalOrder: number) => void;

  // Real-time events
  setPresenceUsers: (users: PresenceUser[]) => void;
  setTaskLocked: (taskId: string, userName: string) => void;
  setTaskUnlocked: (taskId: string) => void;

  // Notes actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNoteInStore: (note: Note) => void;
  deleteNoteInStore: (noteId: string) => void;

  // Modal actions
  setAIBreakdownOpen: (open: boolean) => void;
  setAINotesOpen: (open: boolean) => void;
  setCreateTaskOpen: (open: boolean, colId?: string) => void;
  setSelectedTaskForDetail: (task: Task | null) => void;
  setLoginModalOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  workspaces: [],
  currentWorkspace: null,
  boards: [],
  currentBoard: null,

  tasks: [],
  notes: [],
  activePresenceUsers: [],
  lockedTasks: {},

  isAIBreakdownOpen: false,
  isAINotesOpen: false,
  isCreateTaskOpen: false,
  selectedColumnForCreate: null,
  selectedTaskForDetail: null,
  isLoginModalOpen: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => {
      // Avoid duplicate
      if (state.tasks.some((t) => t.id === task.id)) return state;
      return { tasks: [task, ...state.tasks] };
    }),

  updateTask: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      selectedTaskForDetail:
        state.selectedTaskForDetail?.id === task.id ? task : state.selectedTaskForDetail,
    })),

  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      selectedTaskForDetail:
        state.selectedTaskForDetail?.id === taskId ? null : state.selectedTaskForDetail,
    })),

  moveTaskOptimistic: (taskId, destColId, newOrder) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, column_id: destColId, order: newOrder }
          : t
      ),
    })),

  revertTaskMove: (taskId, originalColId, originalOrder) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, column_id: originalColId, order: originalOrder }
          : t
      ),
    })),

  setPresenceUsers: (users) => set({ activePresenceUsers: users }),

  setTaskLocked: (taskId, userName) =>
    set((state) => ({
      lockedTasks: { ...state.lockedTasks, [taskId]: userName },
    })),

  setTaskUnlocked: (taskId) =>
    set((state) => {
      const copy = { ...state.lockedTasks };
      delete copy[taskId];
      return { lockedTasks: copy };
    }),

  setNotes: (notes) => set({ notes }),
  addNote: (note) =>
    set((state) => {
      if (state.notes.some((n) => n.id === note.id)) return state;
      return { notes: [note, ...state.notes] };
    }),
  updateNoteInStore: (note) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? note : n)),
    })),
  deleteNoteInStore: (noteId) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== noteId),
    })),

  setAIBreakdownOpen: (open) => set({ isAIBreakdownOpen: open }),
  setAINotesOpen: (open) => set({ isAINotesOpen: open }),
  setCreateTaskOpen: (open, colId) =>
    set({ isCreateTaskOpen: open, selectedColumnForCreate: colId || null }),
  setSelectedTaskForDetail: (task) => set({ selectedTaskForDetail: task }),
  setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),
}));

