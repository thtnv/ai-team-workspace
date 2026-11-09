'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Clock,
  Sparkles,
  Plus,
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { Task, Priority } from '@/types';

const priorityBadges: Record<Priority, { label: string; cls: string; dot: string }> = {
  urgent: { label: 'Khẩn cấp', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  high: { label: 'Cao', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  medium: { label: 'Vừa', cls: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  low: { label: 'Thấp', cls: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

export const ListView: React.FC = () => {
  const {
    currentBoard,
    tasks,
    currentUser,
    searchQuery,
    selectedPriority,
    selectedTag,
    filterMyTasksOnly,
    setSelectedTaskForDetail,
    setCreateTaskOpen,
  } = useStore();

  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  const toggleCol = (colId: string) => {
    setCollapsedCols((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const columns = currentBoard?.columns || [
    { id: 'col-todo', title: 'To Do', order: 0, color: '#64748b' },
    { id: 'col-inprogress', title: 'In Progress', order: 1, color: '#38bdf8' },
    { id: 'col-review', title: 'In Review', order: 2, color: '#facc15' },
    { id: 'col-done', title: 'Done', order: 3, color: '#22c55e' },
  ];

  // Filter tasks using the exact same Zustand filters
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

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto bg-slate-50 p-4 sm:p-6 space-y-6">
      {columns.map((col) => {
        const colTasks = filteredTasks
          .filter((t) => t.column_id === col.id)
          .sort((a, b) => a.order - b.order);

        const isCollapsed = Boolean(collapsedCols[col.id]);

        return (
          <div
            key={col.id}
            className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition"
          >
            {/* Column Group Header */}
            <div
              onClick={() => toggleCol(col.id)}
              className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100/70 transition"
            >
              <div className="flex items-center gap-2.5">
                <button className="text-slate-400 hover:text-slate-700 transition">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: col.color || '#64748b' }}
                />

                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {col.title}
                </h3>

                <span className="rounded-full bg-slate-200 px-2 py-0.2 text-[10px] font-bold text-slate-700 font-mono">
                  {colTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateTaskOpen(true, col.id);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shadow-2xs"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Thêm việc</span>
              </button>
            </div>

            {/* Tasks Table */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-100">
                {colTasks.length === 0 ? (
                  <div className="px-6 py-6 text-center text-xs text-slate-400">
                    Không có công việc nào trong danh sách này.
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const pri = priorityBadges[task.priority] || priorityBadges.medium;
                    const totalChk = task.checklists?.length || 0;
                    const doneChk = task.checklists?.filter((c) => c.is_done).length || 0;
                    const commentsCount = task.comments?.length || 0;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForDetail(task)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80 transition cursor-pointer group"
                      >
                        {/* Left: Status Icon, Title, AI Badge, Tags */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {col.id === 'col-done' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-300 group-hover:text-slate-400 shrink-0" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-slate-950">
                                {task.title}
                              </span>

                              {task.ai_generated && (
                                <span className="inline-flex items-center gap-0.5 rounded-md border border-[#bce000] bg-[#D4FF00]/50 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-950 shrink-0">
                                  <Sparkles className="h-2 w-2" />
                                  <span>AI</span>
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Meta Columns */}
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs pl-7 sm:pl-0 flex-wrap">
                          {/* Priority Badge */}
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pri.cls}`}
                          >
                            {pri.label}
                          </span>

                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="hidden md:flex items-center gap-1">
                              {task.tags.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono text-slate-600"
                                >
                                  #{t}
                                </span>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  +{task.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Checklist Indicator */}
                          {totalChk > 0 && (
                            <div
                              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 font-mono"
                              title={`Checklist: ${doneChk}/${totalChk}`}
                            >
                              <CheckSquare className="h-3 w-3 text-slate-400" />
                              <span>
                                {doneChk}/{totalChk}
                              </span>
                            </div>
                          )}

                          {/* Comments Count */}
                          {commentsCount > 0 && (
                            <div
                              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 font-mono"
                              title={`${commentsCount} bình luận`}
                            >
                              <MessageSquare className="h-3 w-3 text-slate-400" />
                              <span>{commentsCount}</span>
                            </div>
                          )}

                          {/* Due Date */}
                          {task.due_date && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>{task.due_date}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

