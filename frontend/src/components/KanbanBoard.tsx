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
} from '@dnd-kit/core';
import confetti from 'canvas-confetti';
import { useStore } from '@/store/useStore';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { Task } from '@/types';
import { socketService } from '@/lib/socket';
import { api } from '@/lib/api';

export const KanbanBoard: React.FC = () => {
  const {
    currentBoard,
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
  } = useStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);

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

    socket.on('task:moved', handleRemoteTaskMoved);
    socket.on('task:created', handleRemoteTaskCreated);
    socket.on('task:updated', handleRemoteTaskUpdated);
    socket.on('task:deleted', handleRemoteTaskDeleted);
    socket.on('presence:sync', handlePresenceSync);
    socket.on('task:locked', handleTaskLocked);
    socket.on('task:unlocked', handleTaskUnlocked);
    socket.on('task:comment_added', handleCommentAdded);

    return () => {
      socket.off('task:moved', handleRemoteTaskMoved);
      socket.off('task:created', handleRemoteTaskCreated);
      socket.off('task:updated', handleRemoteTaskUpdated);
      socket.off('task:deleted', handleRemoteTaskDeleted);
      socket.off('presence:sync', handlePresenceSync);
      socket.off('task:locked', handleTaskLocked);
      socket.off('task:unlocked', handleTaskUnlocked);
      socket.off('task:comment_added', handleCommentAdded);
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

  return (
    <div className="flex-1 min-h-0 w-full p-3 bg-slate-50 flex flex-col overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Responsive Grid with 4 equal columns fitting 100% of width, NO horizontal scroll */}
        <div className="grid grid-cols-4 gap-3 h-full min-h-0 w-full items-stretch">
          {columns.map((column) => {
            const columnTasks = filteredTasks
              .filter((t) => t.column_id === column.id)
              .sort((a, b) => a.order - b.order);

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
              />
            );
          })}
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
