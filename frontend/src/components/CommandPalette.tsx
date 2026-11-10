'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import {
  Search,
  Sparkles,
  Plus,
  Users,
  FileText,
  LogOut,
  Kanban,
  List,
  Compass,
  ArrowRight,
  Clock,
  CornerDownLeft,
  X,
  Settings,
} from 'lucide-react';
import { Priority, Task, PRIORITY_CONFIG } from '@/types';

export const CommandPalette: React.FC = () => {
  const {
    currentUser,
    currentWorkspace,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    tasks,
    currentBoard,
    currentView,
    setCurrentView,
    setAIBreakdownOpen,
    setCreateTaskOpen,
    setInviteModalOpen,
    setAINotesOpen,
    setWalkthroughOpen,
    setWorkspaceSettingsOpen,
    setSelectedTaskForDetail,
    setCurrentUser,
  } = useStore();

  const isOwner = Boolean(currentUser && currentWorkspace && currentUser.id === currentWorkspace.owner_id);
  const currentMember = currentWorkspace?.members?.find((m) => m.user_id === currentUser?.id);
  const isAdmin = Boolean(isOwner || currentMember?.role === 'admin');

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  // Focus input on open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Define Quick Actions
  const allActions = useMemo(() => {
    const actions = [
      {
        id: 'act-ai',
        type: 'action',
        title: 'Phân rã tính năng bằng AI Gemini 3.5',
        subtitle: 'Tự động tạo task và checklist từ User Story',
        icon: Sparkles,
        iconColor: 'text-slate-950 bg-[#D4FF00]',
        keywords: 'ai gemini breakdown phan ra tao task',
        run: () => {
          setCommandPaletteOpen(false);
          setAIBreakdownOpen(true);
        },
      },
      {
        id: 'act-create-task',
        type: 'action',
        title: 'Tạo thẻ việc mới',
        subtitle: 'Thêm công việc mới vào bảng Kanban',
        icon: Plus,
        iconColor: 'text-white bg-slate-900',
        keywords: 'create new task tao viec moi them',
        run: () => {
          setCommandPaletteOpen(false);
          setCreateTaskOpen(true);
        },
      },
      {
        id: 'act-toggle-view',
        type: 'action',
        title: currentView === 'kanban' ? 'Chuyển sang xem dạng Danh sách (List View)' : 'Chuyển sang xem dạng Bảng (Kanban View)',
        subtitle: 'Thay đổi layout hiển thị thẻ công việc',
        icon: currentView === 'kanban' ? List : Kanban,
        iconColor: 'text-white bg-indigo-600',
        keywords: 'view layout switch table list kanban bang danh sach',
        run: () => {
          setCommandPaletteOpen(false);
          setCurrentView(currentView === 'kanban' ? 'list' : 'kanban');
        },
      },
    ];

    if (isAdmin) {
      actions.push(
        {
          id: 'act-workspace-settings',
          type: 'action',
          title: 'Cài đặt Không gian làm việc (Admin Settings)',
          subtitle: 'Quản lý thành viên, đổi tên nhóm và cấu hình AI',
          icon: Settings,
          iconColor: 'text-white bg-slate-800',
          keywords: 'settings admin quan tri cai dat thanh vien phan quyen',
          run: () => {
            setCommandPaletteOpen(false);
            setWorkspaceSettingsOpen(true);
          },
        },
        {
          id: 'act-invite',
          type: 'action',
          title: 'Mời thành viên vào nhóm',
          subtitle: 'Sao chép link mời hoặc gửi email cho đồng đội',
          icon: Users,
          iconColor: 'text-white bg-blue-600',
          keywords: 'invite member share link moi thanh vien dong doi',
          run: () => {
            setCommandPaletteOpen(false);
            setInviteModalOpen(true);
          },
        }
      );
    }

    actions.push(
      {
        id: 'act-notes',
        type: 'action',
        title: 'Mở Sổ tay AI Notes & Biên bản họp',
        subtitle: 'Trích xuất Action Items thành thẻ việc 1-click',
        icon: FileText,
        iconColor: 'text-white bg-amber-600',
        keywords: 'notes meeting bien ban hop ghi chep action items',
        run: () => {
          setCommandPaletteOpen(false);
          setAINotesOpen(true);
        },
      },
      {
        id: 'act-tour',
        type: 'action',
        title: 'Xem lại Tour hướng dẫn sử dụng (Product Walkthrough)',
        subtitle: 'Khám phá các tính năng chính của SyncPulse',
        icon: Compass,
        iconColor: 'text-white bg-emerald-600',
        keywords: 'tour huong dan ftue walkthrough onboarding help',
        run: () => {
          setCommandPaletteOpen(false);
          setWalkthroughOpen(true);
        },
      },
      {
        id: 'act-logout',
        type: 'action',
        title: 'Đăng xuất tài khoản',
        subtitle: 'Thoát phiên làm việc hiện tại',
        icon: LogOut,
        iconColor: 'text-white bg-rose-600',
        keywords: 'logout exit dang xuat thoat',
        run: () => {
          setCommandPaletteOpen(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('syncpulse_token');
            localStorage.removeItem('syncpulse_user');
          }
          setCurrentUser(null);
          window.location.reload();
        },
      }
    );

    return actions;
  }, [isAdmin, currentView, setCurrentView, setAIBreakdownOpen, setCreateTaskOpen, setInviteModalOpen, setAINotesOpen, setWalkthroughOpen, setWorkspaceSettingsOpen, setCommandPaletteOpen, setCurrentUser]);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return allActions;
    const q = query.toLowerCase().trim();
    return allActions.filter(
      (act) =>
        act.title.toLowerCase().includes(q) ||
        act.subtitle.toLowerCase().includes(q) ||
        act.keywords.includes(q)
    );
  }, [allActions, query]);

  // Filter tasks based on query
  const filteredTasks = useMemo(() => {
    if (!query.trim()) return tasks.slice(0, 5); // Show first 5 tasks when query is empty
    const q = query.toLowerCase().trim();
    return tasks
      .filter((t) => {
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = t.description?.toLowerCase().includes(q);
        const inTags = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        const inId = t.id.toLowerCase().includes(q);
        return inTitle || inDesc || inTags || inId;
      })
      .slice(0, 8);
  }, [tasks, query]);

  // Combined flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const list: Array<
      | { kind: 'action'; data: (typeof allActions)[0] }
      | { kind: 'task'; data: Task }
    > = [];

    filteredActions.forEach((act) => list.push({ kind: 'action', data: act }));
    filteredTasks.forEach((tsk) => list.push({ kind: 'task', data: tsk }));
    return list;
  }, [filteredActions, filteredTasks]);

  // Keep selected index in bound
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatItems.length]);

  const handleSelect = (index: number) => {
    const item = flatItems[index];
    if (!item) return;
    if (item.kind === 'action') {
      item.data.run();
    } else {
      setCommandPaletteOpen(false);
      setSelectedTaskForDetail(item.data);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  if (!isCommandPaletteOpen) return null;

  let currentIndex = -1;

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-200 px-4 py-3 bg-white">
          <Search className="h-4 w-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Gõ lệnh hoặc tìm thẻ việc... (dùng ↑ ↓ để chọn)"
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden"
          />
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400 ml-2">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5">ESC</kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions Group */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Thao tác nhanh
              </div>
              <div className="space-y-0.5">
                {filteredActions.map((act) => {
                  currentIndex++;
                  const isCurrent = currentIndex === selectedIndex;
                  const Icon = act.icon;

                  return (
                    <div
                      key={act.id}
                      onClick={() => act.run()}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs shrink-0 shadow-2xs ${act.iconColor}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 truncate">
                          <div className={`font-semibold ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                            {act.title}
                          </div>
                          <div className={`text-[10px] truncate ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                            {act.subtitle}
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-[#D4FF00] shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tasks Group */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Thẻ công việc ({filteredTasks.length})</span>
                <span className="font-normal font-sans text-[10px]">Nhấn Enter để mở</span>
              </div>
              <div className="space-y-0.5">
                {filteredTasks.map((t) => {
                  currentIndex++;
                  const isCurrent = currentIndex === selectedIndex;
                  const pri = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        setSelectedTaskForDetail(t);
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase shrink-0 ${
                            isCurrent ? 'bg-slate-800 text-white border-slate-700' : pri.boxClass
                          }`}
                        >
                          {pri.label}
                        </span>

                        <span
                          className={`font-medium truncate ${
                            isCurrent ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {t.title}
                        </span>

                        {t.ai_generated && (
                          <span className="rounded bg-[#D4FF00] text-slate-950 px-1 py-0.1 text-[9px] font-extrabold shrink-0">
                            AI
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {t.tags && t.tags.length > 0 && (
                          <span
                            className={`text-[10px] font-mono hidden sm:inline ${
                              isCurrent ? 'text-slate-400' : 'text-slate-400'
                            }`}
                          >
                            #{t.tags[0]}
                          </span>
                        )}
                        {isCurrent && (
                          <CornerDownLeft className="h-3.5 w-3.5 text-[#D4FF00]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {flatItems.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              Không tìm thấy lệnh hoặc công việc nào khớp với &quot;{query}&quot;.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono font-bold mr-1">↑↓</kbd>
              Điều hướng
            </span>
            <span>
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-mono font-bold mr-1">↵</kbd>
              Thực hiện
            </span>
          </div>

          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Gợi ý: Nhấn <strong className="font-mono text-slate-600">Ctrl + K</strong> bất cứ lúc nào
          </span>
        </div>
      </div>
    </div>
  );
};

