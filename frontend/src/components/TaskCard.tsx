'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Priority } from '@/types';
import { useStore } from '@/store/useStore';
import { socketService } from '@/lib/socket';
import { CheckSquare, Clock, Sparkles, GripVertical, Lock } from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

const priorityConfig: Record<Priority, { label: string; badgeClass: string }> = {
  urgent: { label: 'Khẩn cấp', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  high: { label: 'Cao', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  medium: { label: 'Vừa', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  low: { label: 'Thấp', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { setSelectedTaskForDetail, lockedTasks, currentUser, currentBoard } = useStore();

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

  const isLockedByOther = lockedTasks[task.id] && lockedTasks[task.id] !== currentUser?.full_name;

  const totalChecklists = task.checklists?.length || 0;
  const completedChecklists = task.checklists?.filter((c) => c.is_done).length || 0;
  const progressPercent = totalChecklists > 0 ? (completedChecklists / totalChecklists) * 100 : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Only open details if not actively dragging
    setSelectedTaskForDetail(task);
    if (currentBoard?.id && currentUser?.full_name) {
      socketService.emitLockTask(currentBoard.id, task.id, currentUser.full_name);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={`group relative rounded-xl border p-4 transition-all duration-150 select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-30 shadow-2xl ring-2 ring-[#84CC16] scale-102 z-50 bg-white'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
      } ${isLockedByOther ? 'border-amber-400 bg-amber-50/50' : ''}`}
    >
      {/* Remote Lock Indicator */}
      {isLockedByOther && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          <Lock className="h-3 w-3 animate-pulse text-amber-600" />
          <span>{lockedTasks[task.id]} đang xem...</span>
        </div>
      )}

      {/* Header: Priority & AI Badge & Grip Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              priorityConfig[task.priority]?.badgeClass || priorityConfig.medium.badgeClass
            }`}
          >
            {priorityConfig[task.priority]?.label || task.priority}
          </span>

          {task.ai_generated && (
            <span
              title="Được phân rã bởi AI Gemini"
              className="inline-flex items-center gap-1 rounded-md border border-[#C4F000] bg-[#D4FF00]/50 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950"
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
        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug">
          {task.title}
        </h4>

        {task.description && (
          <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Checklist Progress Bar */}
      {totalChecklists > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
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
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
        {/* Tags */}
        <div className="flex items-center gap-1 overflow-hidden">
          {task.tags && task.tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 font-mono font-medium"
            >
              #{tag}
            </span>
          ))}
          {task.tags && task.tags.length > 2 && (
            <span className="text-[10px] text-slate-500 font-semibold">+{task.tags.length - 2}</span>
          )}
        </div>

        {/* Due Date */}
        {task.due_date && (
          <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px] font-medium">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{task.due_date}</span>
          </div>
        )}
      </div>
    </div>
  );
};
