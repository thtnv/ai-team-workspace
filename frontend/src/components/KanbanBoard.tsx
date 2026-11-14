'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
} from '@dnd-kit/core';
import confetti from 'canvas-confetti';
import { Plus, X, Palette, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { Task, sortTasksList } from '@/types';
import { socketService } from '@/lib/socket';
import { api } from '@/lib/api';

const PRESET_COLORS = [
  '#64748b', // slate
  '#38bdf8', // sky
  '#818cf8', // indigo
  '#a855f7', // purple
  '#facc15', // yellow
  '#f97316', // orange
  '#22c55e', // green
  '#f43f5e', // rose
];

export const KanbanBoard: React.FC = () => {
  const {
    currentBoard,
    currentWorkspace,
    setCurrentBoard,
    tasks,
    setTasks,
    moveTaskOptimistic,
    revertTaskMove,
    addTask,
    updateTask,
    deleteTask,
    setPresenceUsers,
    setTaskLocked,
    setTaskUnlocked,
    addTaskComment,
    currentUser,
    searchQuery,
    selectedPriority,
    selectedTag,
    filterMyTasksOnly,
    sortBy,
  } = useStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [newColColor, setNewColColor] = useState(PRESET_COLORS[0]);

  // Workspace admin / owner check
  const isOwner = Boolean(currentUser && currentWorkspace && currentUser.id === currentWorkspace.owner_id);
  const currentMember = currentWorkspace?.members?.find((m) => m.user_id === currentUser?.id);
  const isAdmin = Boolean(isOwner || currentMember?.role === 'admin');

  // Filter tasks based on Search Keyword, Priority, Tag, and My Tasks Only
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = task.title.toLowerCase().includes(q);
        const inDesc = task.description?.toLowerCase().includes(q);
        const inTags = task.tags?.some((t) => t.toLowerCase().includes(q));
        const inChecklist = task.checklists?.some((c) => c.title.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags && !inChecklist) return false;
      }
      if (selectedPriority && task.priority !== selectedPriority) {
        return false;
      }
      if (selectedTag && !task.tags?.map((t) => t.toLowerCase()).includes(selectedTag.toLowerCase())) {
        return false;
      }
      if (filterMyTasksOnly && currentUser && !task.assignees?.includes(currentUser.id)) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedPriority, selectedTag, filterMyTasksOnly, currentUser]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Optimized hybrid collision detection: fast pointerWithin for 60fps tracking with closestCorners fallback
  const collisionDetectionStrategy = (args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  };

  useEffect(() => {
    if (!currentBoard || !currentUser) return;

    const socket = socketService.connect();

    socketService.joinBoard(currentBoard.id, {
      id: currentUser.id,
      name: currentUser.full_name,
      email: currentUser.email,
      avatar_url: currentUser.avatar_url,
    });

    const handleRemoteTaskMoved = (data: {
      task_id: string;
      board_id: string;
      dest_col_id: string;
      new_order: number;
    }) => {
      if (data.board_id === currentBoard.id) {
        moveTaskOptimistic(data.task_id, data.dest_col_id, data.new_order);
      }
    };

    const handleRemoteTaskCreated = (data: { task: Task }) => {
      if (data.task && data.task.board_id === currentBoard.id) {
        addTask(data.task);
      }
    };

    const handleRemoteTaskUpdated = (data: { task: Task }) => {
      if (data.task && data.task.board_id === currentBoard.id) {
        updateTask(data.task);
      }
    };

    const handleRemoteTaskDeleted = (data: { task_id: string; board_id: string }) => {
      if (data.board_id === currentBoard.id) {
        deleteTask(data.task_id);
      }
    };

    const handlePresenceSync = (data: { board_id: string; active_users: any[] }) => {
      if (data.board_id === currentBoard.id) {
        setPresenceUsers(data.active_users || []);
      }
    };

    const handleTaskLocked = (data: { task_id: string; locked_by: string }) => {
      setTaskLocked(data.task_id, data.locked_by);
    };

    const handleTaskUnlocked = (data: { task_id: string }) => {
      setTaskUnlocked(data.task_id);
    };

    const handleCommentAdded = (data: { task_id: string; board_id: string; comment: any }) => {
      if (data.board_id === currentBoard.id) {
        addTaskComment(data.task_id, data.comment);
      }
    };

    const handleColumnsUpdated = (data: { board_id: string; columns: any[] }) => {
      if (data.board_id === currentBoard.id) {
        setCurrentBoard({
          ...currentBoard,
          columns: data.columns,
        });
      }
    };

    socket.on('task:moved', handleRemoteTaskMoved);
    socket.on('task:created', handleRemoteTaskCreated);
    socket.on('task:updated', handleRemoteTaskUpdated);
    socket.on('task:deleted', handleRemoteTaskDeleted);
    socket.on('presence:sync', handlePresenceSync);
    socket.on('task:locked', handleTaskLocked);
    socket.on('task:unlocked', handleTaskUnlocked);
    socket.on('task:comment_added', handleCommentAdded);
    socket.on('columns_updated', handleColumnsUpdated);

    return () => {
      socket.off('task:moved', handleRemoteTaskMoved);
      socket.off('task:created', handleRemoteTaskCreated);
      socket.off('task:updated', handleRemoteTaskUpdated);
      socket.off('task:deleted', handleRemoteTaskDeleted);
      socket.off('presence:sync', handlePresenceSync);
      socket.off('task:locked', handleTaskLocked);
      socket.off('task:unlocked', handleTaskUnlocked);
      socket.off('task:comment_added', handleCommentAdded);
      socket.off('columns_updated', handleColumnsUpdated);
      socketService.leaveBoard(currentBoard.id);
    };
  }, [currentBoard?.id, currentUser]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !currentBoard) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const sourceTask = tasks.find((t) => t.id === taskId);
    if (!sourceTask) return;

    const sourceColId = sourceTask.column_id;
    const originalOrder = sourceTask.order;

    let destColId = sourceColId;
    const overColumn = currentBoard.columns.find((c) => c.id === overId);
    if (overColumn) {
      destColId = overColumn.id;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        destColId = overTask.column_id;
      }
    }

    const colTasks = tasks
      .filter((t) => t.column_id === destColId && t.id !== taskId)
      .sort((a, b) => a.order - b.order);

    let newOrder = 1000.0;
    if (colTasks.length > 0) {
      const overTaskIndex = colTasks.findIndex((t) => t.id === overId);
      if (overTaskIndex === -1) {
        newOrder = colTasks[colTasks.length - 1].order + 1000.0;
      } else if (overTaskIndex === 0) {
        newOrder = colTasks[0].order / 2.0;
      } else {
        newOrder = (colTasks[overTaskIndex - 1].order + colTasks[overTaskIndex].order) / 2.0;
      }
    }

    // 1. Optimistic Update
    moveTaskOptimistic(taskId, destColId, newOrder);

    // 2. Confetti on Done
    if (destColId === 'col-done' && sourceColId !== 'col-done') {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#D4FF00', '#22c55e', '#38bdf8', '#f59e0b'],
        });
      } catch (e) {
        console.warn('Confetti error:', e);
      }
    }

    // 3. Socket broadcast
    socketService.emitMoveTask({
      task_id: taskId,
      board_id: currentBoard.id,
      source_col_id: sourceColId,
      dest_col_id: destColId,
      new_order: newOrder,
    });

    // 4. API Persist
    try {
      await api.moveTask({
        task_id: taskId,
        board_id: currentBoard.id,
        source_col_id: sourceColId,
        dest_col_id: destColId,
        new_order: newOrder,
      });
    } catch (error) {
      console.error('Failed to persist task move. Reverting...', error);
      revertTaskMove(taskId, sourceColId, originalOrder);
    }
  };

  const columns = currentBoard?.columns || [
    { id: 'col-todo', title: 'To Do', order: 0, color: '#64748b' },
    { id: 'col-inprogress', title: 'In Progress', order: 1, color: '#38bdf8' },
    { id: 'col-review', title: 'In Review', order: 2, color: '#facc15' },
    { id: 'col-done', title: 'Done', order: 3, color: '#22c55e' },
  ];

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle.trim() || !currentBoard) return;
    const colId = `col-${Date.now()}`;
    const newColumns = [
      ...columns,
      {
        id: colId,
        title: newColTitle.trim(),
        order: columns.length,
        color: newColColor,
      },
    ];

    try {
      const updatedBoard = await api.updateBoardColumns(currentBoard.id, newColumns);
      setCurrentBoard(updatedBoard);
      setNewColTitle('');
      setIsAddingColumn(false);
    } catch (err: any) {
      alert(err.message || 'Không thể thêm cột mới.');
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!currentBoard) return;
    const remainingColumns = columns.filter((c) => c.id !== colId);
    try {
      const updatedBoard = await api.updateBoardColumns(currentBoard.id, remainingColumns);
      setCurrentBoard(updatedBoard);
      setTasks(
        tasks.map((t) => (t.column_id === colId ? { ...t, column_id: 'col-todo' } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Không thể xóa cột.');
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full p-3 bg-slate-50 flex flex-col overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Dynamic Horizontal Columns layout: flex with auto-fill or scroll when > 4 */}
        <div className="flex gap-3 h-full min-h-0 w-full overflow-x-auto pb-1 items-stretch scrollbar-thin">
          {columns.map((column) => {
            const columnTasks = sortTasksList(
              filteredTasks.filter((t) => t.column_id === column.id),
              sortBy
            );

            return (
              <div
                key={column.id}
                className="flex-1 min-w-[270px] max-w-[360px] h-full min-h-0 flex flex-col"
              >
                <KanbanColumn
                  column={column}
                  tasks={columnTasks}
                  canDelete={isAdmin}
                  onDeleteColumn={handleDeleteColumn}
                />
              </div>
            );
          })}

          {/* Add Column Button / Popover (Admin Only) */}
          {isAdmin && (
            <div className="flex-shrink-0 w-72 h-full min-h-0 flex flex-col">
              {isAddingColumn ? (
                <div className="rounded-xl border border-slate-300 bg-white p-3 shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900">Thêm cột mới</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingColumn(false)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddColumn} className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Tên cột:
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={newColTitle}
                        onChange={(e) => setNewColTitle(e.target.value)}
                        placeholder="VD: QA Testing, Blocked..."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-800 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Màu sắc nhận diện:
                      </label>
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {PRESET_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setNewColColor(col)}
                            className="h-5 w-5 rounded-full flex items-center justify-center transition hover:scale-110 shadow-2xs"
                            style={{ backgroundColor: col }}
                          >
                            {newColColor === col && <Check className="h-3 w-3 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddingColumn(false)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={!newColTitle.trim()}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-40"
                      >
                        Tạo cột
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-100/60 p-4 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm cột</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-102 opacity-95 shadow-xl pointer-events-none w-72">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
