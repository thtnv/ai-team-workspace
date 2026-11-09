import { create } from 'zustand';
import { User, Workspace, Board, Task, TaskComment, Note, PresenceUser, SortOption, DensityMode } from '@/types';

interface AppState {
  // Auth & Core Context
  currentUser: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  boards: Board[];
  currentBoard: Board | null;

  // View state: 'kanban' or 'list'
  currentView: 'kanban' | 'list';

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
  isOnboardingOpen: boolean;
  isInviteModalOpen: boolean;
  isQuickStartOpen: boolean;
  isCommandPaletteOpen: boolean;
  isWalkthroughOpen: boolean;
  isWorkspaceSettingsOpen: boolean;

  // Search & Filters state
  searchQuery: string;
  selectedPriority: string | null;
  selectedTag: string | null;
  filterMyTasksOnly: boolean;
  sortBy: SortOption;
  densityMode: DensityMode;

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

  // Search & Filter actions
  setSearchQuery: (query: string) => void;
  setSelectedPriority: (priority: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  setFilterMyTasksOnly: (enabled: boolean) => void;
  setSortBy: (sort: SortOption) => void;
  setDensityMode: (mode: DensityMode) => void;
  resetFilters: () => void;

  // View action
  setCurrentView: (view: 'kanban' | 'list') => void;

  // Comments
  addTaskComment: (taskId: string, comment: TaskComment) => void;

  // Modal actions
  setAIBreakdownOpen: (open: boolean) => void;
  setAINotesOpen: (open: boolean) => void;
  setCreateTaskOpen: (open: boolean, colId?: string) => void;
  setSelectedTaskForDetail: (task: Task | null) => void;
  setLoginModalOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean) => void;
  setInviteModalOpen: (open: boolean) => void;
  setQuickStartOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setWalkthroughOpen: (open: boolean) => void;
  setWorkspaceSettingsOpen: (open: boolean) => void;
  updateWorkspaceInStore: (workspace: Workspace) => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  workspaces: [],
  currentWorkspace: null,
  boards: [],
  currentBoard: null,

  currentView: 'kanban',

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
  isOnboardingOpen: false,
  isInviteModalOpen: false,
  isQuickStartOpen: false,
  isCommandPaletteOpen: false,
  isWalkthroughOpen: false,
  isWorkspaceSettingsOpen: false,

  searchQuery: '',
  selectedPriority: null,
  selectedTag: null,
  filterMyTasksOnly: false,
  sortBy: 'manual',
  densityMode: 'comfortable',

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

  // Search & Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedPriority: (priority) => set({ selectedPriority: priority }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setFilterMyTasksOnly: (enabled) => set({ filterMyTasksOnly: enabled }),
  setSortBy: (sortBy) => set({ sortBy }),
  setDensityMode: (densityMode) => set({ densityMode }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedPriority: null,
      selectedTag: null,
      filterMyTasksOnly: false,
      sortBy: 'manual',
    }),

  setCurrentView: (view) => set({ currentView: view }),

  addTaskComment: (taskId, comment) =>
    set((state) => {
      const updatedTasks = state.tasks.map((t) => {
        if (t.id === taskId) {
          const existing = t.comments || [];
          if (existing.some((c) => c.id === comment.id)) return t;
          return { ...t, comments: [...existing, comment] };
        }
        return t;
      });

      let updatedDetail = state.selectedTaskForDetail;
      if (updatedDetail && updatedDetail.id === taskId) {
        const existing = updatedDetail.comments || [];
        if (!existing.some((c) => c.id === comment.id)) {
          updatedDetail = { ...updatedDetail, comments: [...existing, comment] };
        }
      }

      return {
        tasks: updatedTasks,
        selectedTaskForDetail: updatedDetail,
      };
    }),

  setAIBreakdownOpen: (open) => set({ isAIBreakdownOpen: open }),
  setAINotesOpen: (open) => set({ isAINotesOpen: open }),
  setCreateTaskOpen: (open, colId) =>
    set({ isCreateTaskOpen: open, selectedColumnForCreate: colId || null }),
  setSelectedTaskForDetail: (task) => set({ selectedTaskForDetail: task }),
  setLoginModalOpen: (open) => set({ isLoginModalOpen: open }),
  setOnboardingOpen: (open) => set({ isOnboardingOpen: open }),
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),
  setQuickStartOpen: (open) => set({ isQuickStartOpen: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setWalkthroughOpen: (open) => set({ isWalkthroughOpen: open }),
  setWorkspaceSettingsOpen: (open) => set({ isWorkspaceSettingsOpen: open }),
  updateWorkspaceInStore: (workspace) =>
    set((state) => ({
      currentWorkspace:
        state.currentWorkspace?.id === workspace.id ? workspace : state.currentWorkspace,
      workspaces: state.workspaces.map((w) => (w.id === workspace.id ? workspace : w)),
    })),
}));

