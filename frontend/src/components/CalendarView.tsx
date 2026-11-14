'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Task, PRIORITY_CONFIG } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const {
    tasks,
    setSelectedTaskForDetail,
    setCreateTaskOpen,
    selectedPriority,
    selectedTag,
    filterMyTasksOnly,
    currentUser,
    searchQuery,
  } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter tasks based on global filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchTag = t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTag) return false;
      }
      if (selectedPriority && t.priority !== selectedPriority) return false;
      if (selectedTag && !t.tags.includes(selectedTag)) return false;
      if (filterMyTasksOnly && currentUser) {
        if (!t.assignees || !t.assignees.includes(currentUser.id)) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedPriority, selectedTag, filterMyTasksOnly, currentUser]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  // Month calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  // Adjust so Monday is 0
  const startOffset = (firstDayIndex + 6) % 7;

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  // Map tasks to dates
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach((t) => {
      if (t.due_date) {
        // Formats: "YYYY-MM-DD"
        const dateKey = t.due_date.split('T')[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(t);
      }
    });
    return map;
  }, [filteredTasks]);

  // Undated tasks count
  const undatedTasks = filteredTasks.filter((t) => !t.due_date);

  // Generate calendar cells (42 cells: 6 rows x 7 days)
  const calendarCells = useMemo(() => {
    const cells = [];
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        dateKey: '',
      });
    }

    // Days in current month
    const today = new Date();
    const isThisYearMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        isToday: isThisYearMonth && today.getDate() === d,
        dateKey,
      });
    }

    // Remaining days to complete the 35 or 42 grid
    const totalRemaining = 35 - cells.length > 0 ? 35 - cells.length : (42 - cells.length > 0 ? 42 - cells.length : 0);
    for (let nextD = 1; nextD <= totalRemaining; nextD++) {
      cells.push({
        dayNumber: nextD,
        isCurrentMonth: false,
        dateKey: '',
      });
    }

    return cells;
  }, [year, month, daysInMonth, startOffset]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden p-4">
      {/* Calendar Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-2xs mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-[#D4FF00] font-black shadow-2xs">
            <CalendarIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {monthNames[month]} {year}
            </h2>
            <p className="text-[11px] text-slate-500">
              Tổng số {filteredTasks.length} thẻ việc • {undatedTasks.length} việc chưa đặt hạn chót
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            Hôm nay
          </button>
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={prevMonth}
              className="p-1 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setCreateTaskOpen(true, 'col-todo')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5 text-[#D4FF00]" />
            <span>+ Thẻ việc</span>
          </button>
        </div>
      </div>

      {/* Grid: 7 columns (Mon -> Sun) */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Day Name Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold text-slate-600 py-2">
          {weekDays.map((w, idx) => (
            <div key={idx} className={idx >= 5 ? 'text-rose-600' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 overflow-y-auto">
          {calendarCells.map((cell, idx) => {
            const dayTasks = cell.dateKey ? tasksByDate[cell.dateKey] || [] : [];
            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 flex flex-col transition-colors ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/40 text-slate-300'
                    : cell.isToday
                    ? 'bg-amber-50/30'
                    : 'bg-white hover:bg-slate-50/50'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 text-xs rounded-full font-bold ${
                      cell.isToday
                        ? 'bg-[#D4FF00] text-slate-950 font-black shadow-2xs ring-1 ring-black/10'
                        : cell.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isCurrentMonth && (
                    <button
                      onClick={() => setCreateTaskOpen(true, 'col-todo')}
                      className="opacity-0 hover:opacity-100 transition p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Thêm thẻ việc vào ngày này"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Day Tasks List */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[120px] pr-0.5">
                  {dayTasks.map((t) => {
                    const pConfig = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                    const isDone = t.column_id === 'col-done';
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTaskForDetail(t)}
                        className={`group px-2 py-1 rounded-lg border text-left cursor-pointer transition shadow-2xs flex items-center justify-between gap-1.5 ${
                          isDone
                            ? 'bg-slate-100 border-slate-200 opacity-60'
                            : 'bg-white hover:border-slate-300 border-slate-200'
                        }`}
                        title={t.title}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              t.priority === 'urgent'
                                ? 'bg-rose-500'
                                : t.priority === 'high'
                                ? 'bg-orange-500'
                                : t.priority === 'medium'
                                ? 'bg-amber-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          <p
                            className={`text-[11px] font-semibold truncate ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {t.title}
                          </p>
                        </div>
                        {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
