'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  ArrowUpDown,
  Check,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Priority, PRIORITY_CONFIG, SortOption } from '@/types';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'manual', label: 'Thứ tự kéo thả' },
  { value: 'priority', label: 'Độ ưu tiên cao nhất' },
  { value: 'due_date', label: 'Hạn chót gần nhất' },
  { value: 'newest', label: 'Mới tạo gần nhất' },
  { value: 'title', label: 'Tên việc A-Z' },
];

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
    sortBy,
    setSortBy,
    densityMode,
    setDensityMode,
    resetFilters,
  } = useStore();

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
        setIsPriorityMenuOpen(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setIsTagMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPriorityMenuOpen(false);
        setIsSortMenuOpen(false);
        setIsTagMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    (filterMyTasksOnly ? 1 : 0) +
    (sortBy !== 'manual' ? 1 : 0);

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
    <div className="relative z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0 text-xs">
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

        {/* Priority Filter with Color-Coded Text Boxes (No icons) */}
        <div className="relative hidden sm:block w-40 sm:w-44" ref={priorityMenuRef}>
          {selectedPriority ? (
            <div
              className={`w-full inline-flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider shadow-2xs transition cursor-pointer ${
                PRIORITY_CONFIG[selectedPriority as Priority]?.boxClass
              }`}
              onClick={() => setIsPriorityMenuOpen(!isPriorityMenuOpen)}
            >
              <span className="truncate">{PRIORITY_CONFIG[selectedPriority as Priority]?.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPriority(null);
                  setIsPriorityMenuOpen(false);
                }}
                className="rounded-full p-0.5 hover:bg-black/10 transition cursor-pointer shrink-0"
                title="Bỏ lọc ưu tiên"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPriorityMenuOpen(!isPriorityMenuOpen)}
              className="w-full inline-flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <span className="truncate">Độ ưu tiên: Tất cả</span>
              <ChevronDown className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${isPriorityMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          )}

          {isPriorityMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl space-y-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedPriority(null);
                  setIsPriorityMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition cursor-pointer ${
                  !selectedPriority
                    ? 'border-slate-900 bg-slate-900 text-white font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Tất cả mức độ</span>
                {!selectedPriority && <Check className="h-3.5 w-3.5 text-[#D4FF00] shrink-0" />}
              </button>

              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((pKey) => {
                const conf = PRIORITY_CONFIG[pKey];
                const isSelected = selectedPriority === pKey;
                return (
                  <button
                    key={pKey}
                    type="button"
                    onClick={() => {
                      setSelectedPriority(pKey);
                      setIsPriorityMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs text-left transition cursor-pointer shadow-2xs ${conf.boxClass} ${
                      isSelected ? 'ring-2 ring-slate-900 font-extrabold' : conf.hoverClass
                    }`}
                  >
                    <span>{conf.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-slate-900 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Smart Sort Dropdown */}
        <div className="relative hidden sm:block w-52 sm:w-56" ref={sortMenuRef}>
          <button
            type="button"
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className={`w-full inline-flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer shadow-2xs ${
              sortBy !== 'manual'
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="Sắp xếp thông minh khi có nhiều task cùng độ ưu tiên"
          >
            <div className="flex items-center gap-1.5 truncate">
              <ArrowUpDown className="h-3 w-3 text-slate-500 shrink-0" />
              <span className="truncate">Sắp xếp: {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}</span>
            </div>
            <ChevronDown className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSortMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tiêu chí sắp xếp
              </div>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSortBy(opt.value);
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition cursor-pointer ${
                    sortBy === opt.value
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {sortBy === opt.value && <Check className="h-3.5 w-3.5 text-[#D4FF00] shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag Filter Custom Dropdown (Matching Style of Priority & Sort) */}
        {availableTags.length > 0 && (
          <div className="relative hidden md:block w-40 sm:w-44" ref={tagMenuRef}>
            {selectedTag ? (
              <div
                className="w-full inline-flex items-center justify-between gap-1.5 rounded-lg border border-slate-900 bg-slate-900 text-white px-2.5 py-1 text-[11px] font-mono font-semibold shadow-2xs transition cursor-pointer"
                onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="h-3 w-3 text-[#D4FF00] shrink-0" />
                  <span className="truncate">#{selectedTag}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag(null);
                    setIsTagMenuOpen(false);
                  }}
                  className="rounded-full p-0.5 hover:bg-white/20 transition cursor-pointer shrink-0"
                  title="Bỏ lọc nhãn"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsTagMenuOpen(!isTagMenuOpen)}
                className="w-full inline-flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className="h-3 w-3 text-slate-500 shrink-0" />
                  <span className="truncate">Nhãn: Tất cả (#)</span>
                </div>
                <ChevronDown className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${isTagMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            {isTagMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(null);
                    setIsTagMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition cursor-pointer ${
                    !selectedTag
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span>Tất cả nhãn (#)</span>
                  {!selectedTag && <Check className="h-3.5 w-3.5 text-[#D4FF00] shrink-0" />}
                </button>

                {/* Scrollable list of tags if many tags exist */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTag(tag);
                          setIsTagMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left font-mono transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        <span className="truncate">#{tag}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#D4FF00] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Right: Density Toggle & Task Counter */}
      <div className="flex items-center gap-3 text-slate-500 text-[11px] font-medium shrink-0">
        {/* Density Mode: Comfortable vs Compact */}
        <div className="hidden sm:flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setDensityMode('comfortable')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition cursor-pointer text-[10px] ${
              densityMode === 'comfortable'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Mật độ hiển thị: Chi tiết"
          >
            <Maximize2 className="h-3 w-3" />
            <span className="hidden xl:inline">Chi tiết</span>
          </button>
          <button
            type="button"
            onClick={() => setDensityMode('compact')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition cursor-pointer text-[10px] ${
              densityMode === 'compact'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Mật độ hiển thị: Thu gọn để nhìn được nhiều việc hơn (dài ra)"
          >
            <Minimize2 className="h-3 w-3" />
            <span className="hidden xl:inline">Thu gọn</span>
          </button>
        </div>

        <span>
          Hiển thị <strong className="text-slate-900 font-mono">{filteredTasksCount}</strong> / {tasks.length} việc
        </span>
      </div>
    </div>
  );
};

