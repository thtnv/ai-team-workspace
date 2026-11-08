'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useStore } from '@/store/useStore';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, tasks }) => {
  const { setCreateTaskOpen } = useStore();
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border transition-all duration-150 h-full max-h-full min-h-0 min-w-0 p-2.5 shadow-2xs ${
        isOver
          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400/20 shadow-md'
          : 'border-slate-200/90 bg-slate-100/80'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 px-1 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full ring-1 ring-white shadow-2xs flex-shrink-0"
            style={{ backgroundColor: column.color || '#64748b' }}
          />
          <h3 className="text-xs font-bold tracking-tight text-slate-900 truncate">
            {column.title}
          </h3>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white border border-slate-200 px-1 text-[10px] font-mono font-bold text-slate-700 shadow-2xs flex-shrink-0">
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => setCreateTaskOpen(true, column.id)}
          className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-900 transition cursor-pointer shadow-2xs flex-shrink-0"
          title={`Thêm task vào ${column.title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Task List (Vertically scrollable inside column, never overflows screen) */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1 min-h-0">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-8 text-center bg-white/40">
            <span className="text-[11px] font-medium text-slate-400">Trống</span>
            <button
              onClick={() => setCreateTaskOpen(true, column.id)}
              className="mt-1 text-[11px] font-bold text-slate-700 hover:text-emerald-600 transition cursor-pointer"
            >
              + Thêm
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Button at Bottom */}
      <div className="pt-1.5 flex-shrink-0">
        <button
          onClick={() => setCreateTaskOpen(true, column.id)}
          className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white/50 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-slate-400 hover:bg-white hover:text-slate-900 transition cursor-pointer shadow-2xs"
        >
          <Plus className="h-3 w-3" />
          <span>Thêm việc</span>
        </button>
      </div>
    </div>
  );
};
