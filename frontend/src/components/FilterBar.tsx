'use client';

import React, { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import {
  Search,
  X,
  Filter,
  User,
  Tag,
  Flame,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export const FilterBar: React.FC = () => {
  const {
    tasks,
    currentUser,
    searchQuery,
    setSearchQuery,
    selectedPriority,
    setSelectedPriority,
    selectedTag,
    setSelectedTag,
    filterMyTasksOnly,
    setFilterMyTasksOnly,
    resetFilters,
  } = useStore();

  // Extract all unique tags from active tasks
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        if (tag && tag.trim()) tagSet.add(tag.trim().toLowerCase());
      });
    });
    return Array.from(tagSet);
  }, [tasks]);

  // Count active filters
  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedPriority ? 1 : 0) +
    (selectedTag ? 1 : 0) +
    (filterMyTasksOnly ? 1 : 0);

  // Filtered task count
  const filteredTasksCount = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
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
      if (selectedTag && !task.tags?.map((t) => t.toLowerCase()).includes(selectedTag)) {
        return false;
      }
      if (filterMyTasksOnly && currentUser && !task.assignees?.includes(currentUser.id)) {
        return false;
      }
      return true;
    }).length;
  }, [tasks, searchQuery, selectedPriority, selectedTag, filterMyTasksOnly, currentUser]);

  return (
    <div className="border-b border-slate-200 bg-white/90 backdrop-blur-xs px-4 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0 text-xs">
      {/* Left: Search input & quick filters */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Search input */}
        <div className="relative flex-1 max-w-xs sm:max-w-sm">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, mô tả, #tag..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-8 pr-7 py-1 text-xs text-slate-900 placeholder-slate-400 transition focus:bg-white focus:border-slate-800 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <div className="hidden sm:flex items-center gap-1">
          <select
            value={selectedPriority || ''}
            onChange={(e) => setSelectedPriority(e.target.value ? e.target.value : null)}
            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition cursor-pointer focus:outline-hidden ${
              selectedPriority
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <option value="" className="bg-white text-slate-800 font-normal">Độ ưu tiên: Tất cả</option>
            <option value="urgent" className="bg-white text-slate-800 font-normal">🔴 Khẩn cấp (Urgent)</option>
            <option value="high" className="bg-white text-slate-800 font-normal">🟠 Cao (High)</option>
            <option value="medium" className="bg-white text-slate-800 font-normal">🟡 Vừa (Medium)</option>
            <option value="low" className="bg-white text-slate-800 font-normal">⚪ Thấp (Low)</option>
          </select>
        </div>

        {/* Tag Filter (if tags exist) */}
        {availableTags.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value ? e.target.value : null)}
              className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition cursor-pointer focus:outline-hidden ${
                selectedTag
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <option value="" className="bg-white text-slate-800 font-normal">Nhãn: Tất cả (#)</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag} className="bg-white text-slate-800 font-normal">
                  #{tag}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle "Chỉ việc của tôi" (My tasks) */}
        {currentUser && (
          <button
            type="button"
            onClick={() => setFilterMyTasksOnly(!filterMyTasksOnly)}
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer shadow-2xs ${
              filterMyTasksOnly
                ? 'border-slate-900 bg-slate-900 text-[#D4FF00]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Chỉ hiển thị các công việc được giao cho bạn"
          >
            <User className="h-3 w-3" />
            <span>Việc của tôi</span>
          </button>
        )}

        {/* Reset Filters button */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
            title="Xóa tất cả bộ lọc"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Xóa lọc ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* Right: Task Counter */}
      <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium shrink-0">
        <span>
          Hiển thị <strong className="text-slate-900 font-mono">{filteredTasksCount}</strong> / {tasks.length} việc
        </span>
      </div>
    </div>
  );
};
