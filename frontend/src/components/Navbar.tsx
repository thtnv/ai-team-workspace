'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { Sparkles, FileText, Plus, ChevronDown, LogOut, LogIn } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    currentWorkspace,
    currentBoard,
    activePresenceUsers,
    setPresenceUsers,
    setAIBreakdownOpen,
    setAINotesOpen,
    setCreateTaskOpen,
    setLoginModalOpen,
  } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    if (currentBoard) {
      socketService.leaveBoard(currentBoard.id);
    }
    api.setToken(null);
    setCurrentUser(null);
    setPresenceUsers([]);
    setMenuOpen(false);
    setLoginModalOpen(true);
  };

  // Deduplicate presence users by user_id
  const uniquePresence = Array.from(
    new Map(
      activePresenceUsers
        .filter((u) => u && u.user_id)
        .map((u) => [u.user_id, u])
    ).values()
  );

  const displayUsers =
    uniquePresence.length > 0
      ? uniquePresence
      : currentUser
      ? [
          {
            sid: 'me',
            user_id: currentUser.id,
            name: currentUser.full_name,
            avatar_url: currentUser.avatar_url,
          },
        ]
      : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="flex h-13 items-center justify-between px-4">
        {/* Left: Brand & Workspace */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4FF00] font-black text-slate-950 text-xs shadow-2xs border border-black/10">
              ⚡
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                SyncPulse
              </span>
              <span className="rounded bg-[#D4FF00] px-1 py-0.2 text-[9px] font-black text-slate-950">AI</span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Current Board & Workspace info */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 truncate max-w-[140px]">
              {currentWorkspace?.name || 'Workspace'}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
              {currentBoard?.title || 'Sprint 24'}
            </span>
          </div>
        </div>

        {/* Center: Live Presence Avatars (Deduplicated) */}
        {currentUser && (
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full py-0.5 px-2.5 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-700 hidden sm:inline">
              Online ({displayUsers.length})
            </span>

            <div className="flex -space-x-1.5 overflow-hidden">
              {displayUsers.map((u, i) => (
                <div
                  key={u.user_id || u.sid || i}
                  title={u.name}
                  className="relative inline-block h-5 w-5 rounded-full ring-1 ring-white overflow-hidden bg-slate-200 shadow-2xs"
                >
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt={u.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#D4FF00] text-[9px] font-bold text-slate-950">
                      {u.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2">
          {currentUser && (
            <>
              {/* AI Task Breakdown Button */}
              <button
                onClick={() => setAIBreakdownOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#D4FF00] px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-[#bce000] hover:shadow-xs active:scale-95 cursor-pointer border border-black/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Breakdown</span>
                <span className="sm:hidden">AI</span>
              </button>

              {/* AI Notes Button */}
              <button
                onClick={() => setAINotesOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 active:scale-95 cursor-pointer shadow-2xs"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden md:inline">Notes</span>
              </button>

              {/* Add Task Quick Button */}
              <button
                onClick={() => setCreateTaskOpen(true, 'col-todo')}
                className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs"
                title="Thêm task mới"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">+ Task</span>
              </button>

              <div className="h-4 w-px bg-slate-200" />
            </>
          )}

          {/* User Profile / Login Button */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer"
                title="Tài khoản cá nhân"
              >
                <div className="h-6 w-6 rounded-full bg-slate-200 ring-1 ring-slate-300 overflow-hidden shadow-2xs">
                  {currentUser.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentUser.avatar_url} alt={currentUser.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-800">
                      {currentUser.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-slate-800 truncate max-w-[100px]">
                  {currentUser.full_name?.split(' ')[0] || 'User'}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="px-2 py-1.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.full_name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
