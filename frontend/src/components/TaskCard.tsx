'use client';

import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Priority, PRIORITY_CONFIG } from '@/types';
import { useStore } from '@/store/useStore';
import { socketService } from '@/lib/socket';
import { CheckSquare, Clock, Sparkles, GripVertical, Lock, MessageSquare, User } from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

const TaskCardComponent: React.FC<TaskCardProps> = ({ task }) => {
  const setSelectedTaskForDetail = useStore((s) => s.setSelectedTaskForDetail);
  const lockedByUser = useStore((s) => s.lockedTasks[task.id]);
  const currentUserName = useStore((s) => s.currentUser?.full_name);
  const currentBoardId = useStore((s) => s.currentBoard?.id);
  const densityMode = useStore((s) => s.densityMode);
  const workspaceMembers = useStore((s) => s.currentWorkspace?.members);
  const currentUser = useStore((s) => s.currentUser);

  const assignedMembers = useMemo(() => {
    if (!task.assignees || task.assignees.length === 0) return [];
    const membersList = workspaceMembers ? [...workspaceMembers] : [];
    if (currentUser && !membersList.some((m) => m.user_id === currentUser.id)) {
      membersList.push({
        user_id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: 'admin',
        avatar_url: currentUser.avatar_url,
      });
    }
    return task.assignees
      .map((id) => membersList.find((m) => m.user_id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [task.assignees, workspaceMembers, currentUser]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isLockedByOther = Boolean(lockedByUser && lockedByUser !== currentUserName);
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isCompact = densityMode === 'compact';

  const totalChecklists = task.checklists?.length || 0;
  const completedChecklists = task.checklists?.filter((c) => c.is_done).length || 0;
  const progressPercent = totalChecklists > 0 ? (completedChecklists / totalChecklists) * 100 : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Only open details if not actively dragging
    setSelectedTaskForDetail(task);
    if (currentBoardId && currentUserName) {
      socketService.emitLockTask(currentBoardId, task.id, currentUserName);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={`group relative rounded-xl border border-l-4 transition-all duration-150 select-none cursor-grab active:cursor-grabbing ${
        pri.accentBorder
      } ${isCompact ? 'p-2.5' : 'p-3.5'} ${
        isDragging
          ? 'opacity-30 shadow-2xl ring-2 ring-[#84CC16] scale-102 z-50 bg-white'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
      } ${isLockedByOther ? 'border-amber-400 bg-amber-50/50' : ''}`}
    >
      {/* Remote Lock Indicator */}
      {isLockedByOther && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          <Lock className="h-3 w-3 animate-pulse text-amber-600" />
          <span>{lockedByUser} đang xem...</span>
        </div>
      )}

      {/* Header: Priority & AI Badge & Grip Icon */}
      <div className={`flex items-center justify-between gap-2 ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider shadow-2xs ${
              pri.boxClass
            }`}
          >
            {pri.label}
          </span>

          {task.ai_generated && (
            <span
              title="Được phân rã bởi AI Gemini"
              className="inline-flex items-center gap-1 rounded-md border border-[#C4F000] bg-[#D4FF00]/50 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-950"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>AI</span>
            </span>
          )}
        </div>

        {/* Visual grip indicator */}
        <div className="text-slate-400 group-hover:text-slate-600 transition">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Title & Description */}
      <div>
        <h4
          className={`text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition leading-snug ${
            isCompact ? 'line-clamp-1' : 'line-clamp-2'
          }`}
        >
          {task.title}
        </h4>

        {!isCompact && task.description && (
          <p className="mt-1 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Checklist Progress Bar */}
      {totalChecklists > 0 && (
        <div className={isCompact ? 'mt-2' : 'mt-2.5'}>
          <div className="flex items-center justify-between text-[10px] text-slate-600 mb-0.5">
            <span className="flex items-center gap-1 font-medium">
              <CheckSquare className="h-3 w-3 text-slate-400" />
              <span>Checklist</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-700">
              {completedChecklists}/{totalChecklists}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progressPercent === 100 ? 'bg-emerald-500' : 'bg-[#a3e635]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Tags & Due Date */}
      <div
        className={`flex items-center justify-between border-t border-slate-100 text-[10px] ${
          isCompact ? 'mt-2 pt-1.5' : 'mt-2.5 pt-2'
        }`}
      >
        {/* Tags */}
        <div className="flex items-center gap-1 overflow-hidden">
          {task.tags &&
            task.tags.slice(0, isCompact ? 1 : 2).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] text-slate-700 font-mono font-medium"
              >
                #{tag}
              </span>
            ))}
          {task.tags && task.tags.length > (isCompact ? 1 : 2) && (
            <span className="text-[9px] text-slate-500 font-semibold">
              +{task.tags.length - (isCompact ? 1 : 2)}
            </span>
          )}
        </div>

        {/* Right meta: Comments, Due Date & Assignees */}
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] font-medium">
          {task.comments && task.comments.length > 0 && (
            <div
              className="flex items-center gap-0.5 text-slate-600 font-bold"
              title={`${task.comments.length} bình luận`}
            >
              <MessageSquare className="h-3 w-3 text-slate-400" />
              <span>{task.comments.length}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>{task.due_date}</span>
            </div>
          )}

          {/* Assignees avatars */}
          {assignedMembers.length > 0 ? (
            <div className="flex items-center -space-x-1.5 overflow-hidden pl-0.5">
              {assignedMembers.slice(0, 2).map((m) =>
                m.avatar_url ? (
                  <img
                    key={m.user_id}
                    src={m.avatar_url}
                    alt={m.full_name}
                    title={`Phụ trách: ${m.full_name}`}
                    referrerPolicy="no-referrer"
                    className="h-4.5 w-4.5 rounded-full ring-1.5 ring-white object-cover shadow-2xs"
                  />
                ) : (
                  <div
                    key={m.user_id}
                    title={`Phụ trách: ${m.full_name}`}
                    className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-900 text-[#D4FF00] text-[8px] font-black ring-1.5 ring-white shadow-2xs"
                  >
                    {(m.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )
              )}
              {assignedMembers.length > 2 && (
                <span
                  title={`${assignedMembers.length} người phụ trách`}
                  className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-200 text-[8px] font-bold text-slate-700 ring-1.5 ring-white"
                >
                  +{assignedMembers.length - 2}
                </span>
              )}
            </div>
          ) : (
            <div
              className="flex h-4 w-4 items-center justify-center text-slate-300 hover:text-slate-500 transition"
              title="Chưa có người phụ trách"
            >
              <User className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TaskCard = React.memo(TaskCardComponent);
