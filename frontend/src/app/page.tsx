'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { Navbar } from '@/components/Navbar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ListView } from '@/components/ListView';
import { FilterBar } from '@/components/FilterBar';
import { QuickStartSteps } from '@/components/QuickStartSteps';
import { CommandPalette } from '@/components/CommandPalette';
import { ProductWalkthrough } from '@/components/ProductWalkthrough';
import { AIBreakdownModal } from '@/components/AIBreakdownModal';
import { AINotesModal } from '@/components/AINotesModal';
import { TaskDetailModal } from '@/components/TaskDetailModal';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { LoginModal } from '@/components/LoginModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { InviteModal } from '@/components/InviteModal';
import { WorkspaceSettingsModal } from '@/components/WorkspaceSettingsModal';
import {
  Sparkles,
  ArrowUpRight,
  LogIn,
  ShieldAlert,
  Rocket,
  Building2,
  ChevronDown,
  Kanban,
  List,
  Search,
  Flame,
  Zap,
} from 'lucide-react';

export default function Home() {
  const {
    currentUser,
    setCurrentUser,
    workspaces,
    setWorkspaces,
    currentWorkspace,
    setCurrentWorkspace,
    setBoards,
    setCurrentBoard,
    currentBoard,
    currentView,
    setCurrentView,
    tasks,
    setTasks,
    notes,
    setNotes,
    setAIBreakdownOpen,
    setLoginModalOpen,
    setOnboardingOpen,
    setInviteModalOpen,
    setQuickStartOpen,
    setCommandPaletteOpen,
    setWalkthroughOpen,
  } = useStore();

  const [loading, setLoading] = useState(true);

  const loadWorkspaceData = async (user: any) => {
    try {
      let wsList = await api.getWorkspaces();

      // Check URL query parameters for ?invite= or ?join=
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteCode = urlParams.get('invite') || urlParams.get('join');
        if (inviteCode) {
          try {
            await api.joinWorkspace(inviteCode);
            wsList = await api.getWorkspaces();
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (e) {
            console.warn('Could not join from invite URL param:', e);
          }
        }
      }

      setWorkspaces(wsList);

      if (wsList.length === 0) {
        // New user has no workspace yet -> Open Onboarding Wizard
        setCurrentWorkspace(null);
        setCurrentBoard(null);
        setTasks([]);
        setOnboardingOpen(true);
        return;
      }

      const primaryWorkspace = wsList[0];
      setCurrentWorkspace(primaryWorkspace);

      if (primaryWorkspace) {
        const boards = await api.getWorkspaceBoards(primaryWorkspace.id);
        setBoards(boards);
        const activeBoard = boards[0];
        setCurrentBoard(activeBoard);

        if (activeBoard) {
          const boardTasks = await api.getBoardTasks(activeBoard.id);
          setTasks(boardTasks);

          socketService.joinBoard(activeBoard.id, {
            id: user.id,
            name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
          });
        }

        const notes = await api.getNotes(primaryWorkspace.id);
        setNotes(notes);
      }
    } catch (e) {
      console.warn('Error loading workspace data:', e);
    }
  };

  useEffect(() => {
    async function initApp() {
      try {
        setLoading(true);
        // Check if existing token is valid
        const user = await api.getMe();
        setCurrentUser(user);
        await loadWorkspaceData(user);
      } catch {
        // Not logged in -> Prompt login modal, do NOT auto-login with hardcoded account!
        setCurrentUser(null);
        setLoginModalOpen(true);
      } finally {
        setLoading(false);
      }
    }

    initApp();
  }, []);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.column_id === 'col-done').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'urgent' && t.column_id !== 'col-done').length;
  const completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Quick Start 4 Steps calculation (Linear / Plane onboarding)
  const isStep1Done = Boolean(currentWorkspace && currentWorkspace.members && currentWorkspace.members.length >= 1);
  const isStep2Done = tasks.some((t) => t.ai_generated);
  const isStep3Done = tasks.some((t) => t.column_id === 'col-done');
  const isStep4Done = notes.length > 0;
  const quickStartDoneCount = [isStep1Done, isStep2Done, isStep3Done, isStep4Done].filter(Boolean).length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 selection:bg-[#D4FF00] selection:text-slate-950">
      <Navbar />

      {/* Compact Subheader: Board KPI Metrics & Quick Start Guide */}
      <div className="border-b border-slate-200 bg-white/70 backdrop-blur-xs px-4 py-1.5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Board Title & Progress */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                {currentBoard?.title || 'Sprint 24 - AI Workspace MVP'}
              </h1>
              <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.2 text-[9px] font-bold text-emerald-800">
                Live
              </span>
            </div>

            {currentUser && (
              <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 pl-4 text-xs font-medium">
                <div>
                  <span className="text-slate-500">Tiến độ: </span>
                  <span className="font-bold text-slate-900 font-mono">{completionPercent}%</span>
                </div>
                <div>
                  <span className="text-slate-500">Xong: </span>
                  <span className="font-bold text-slate-800 font-mono">{doneTasks}/{totalTasks}</span>
                </div>
                {urgentTasks > 0 && (
                  <div className="flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-rose-700 font-bold text-[10px]">
                    <Flame className="h-3 w-3 text-rose-500 fill-rose-500 shrink-0" />
                    <span>{urgentTasks} gấp</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subheader Right Actions: View Switch, Ctrl+K, Tour */}
          {currentUser && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View Switch: Kanban ⟷ List */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
                    currentView === 'kanban'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chế độ xem Bảng (Kanban View)"
                >
                  <Kanban className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Bảng</span>
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
                    currentView === 'list'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chế độ xem Danh sách phẳng (List View)"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Danh sách</span>
                </button>
              </div>

              {/* Command Palette Button (Ctrl+K) */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs text-slate-600 shadow-2xs transition cursor-pointer"
                title="Mở Command Palette (Ctrl + K)"
              >
                <Search className="h-3 w-3 text-slate-400" />
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1">
                  Ctrl K
                </span>
              </button>

              {/* Product Walkthrough Tour Button */}
              <button
                onClick={() => setWalkthroughOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs transition cursor-pointer group"
                title="Xem Tour hướng dẫn sử dụng (Product Walkthrough)"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded bg-[#D4FF00] text-slate-950 font-black text-[10px] border border-black/10">
                  <Zap className="h-3 w-3 text-slate-950 fill-slate-950" />
                </div>
                <span className="font-semibold text-slate-900 group-hover:text-slate-950">
                  Tour hướng dẫn
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search & Multi-Filter Bar */}
      {currentUser && currentWorkspace && <FilterBar />}

      {/* Main Board Content - Flex 1 & Zero Overflow for Body */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-[#84CC16]" />
              <span className="text-xs font-medium">Đang tải dữ liệu Workspace...</span>
            </div>
          </div>
        ) : !currentUser ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex flex-col items-center text-center max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4FF00] text-slate-950 font-black text-xl mb-4 border border-black/10">
                <Zap className="h-6 w-6 text-slate-950 fill-slate-950" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Chào mừng đến với SyncPulse AI</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Nền tảng quản lý công việc và cộng tác thời gian thực kết hợp trợ lý AI Google Gemini 3.8. Vui lòng đăng nhập hoặc đăng ký tài khoản để bắt đầu.
              </p>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#D4FF00] px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-[#bce000] transition cursor-pointer shadow-xs border border-black/10"
              >
                <LogIn className="h-4 w-4" />
                <span>Đăng nhập / Đăng ký ngay</span>
              </button>
            </div>
          </div>
        ) : !currentWorkspace ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex flex-col items-center text-center max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4FF00] text-slate-950 font-black text-xl mb-4 border border-black/10">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Chưa có Không gian làm việc</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Bạn chưa tham gia không gian làm việc nào. Hãy khởi tạo Nhóm mới nếu bạn là Nhóm trưởng, hoặc gia nhập nhóm bằng Mã mời.
              </p>
              <button
                onClick={() => setOnboardingOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                <Rocket className="h-4 w-4 text-[#D4FF00]" />
                <span>Thiết lập Không gian làm việc</span>
              </button>
            </div>
          </div>
        ) : currentView === 'list' ? (
          <ListView />
        ) : (
          <KanbanBoard />
        )}
      </main>

      {/* Modals & Overlays */}
      <AIBreakdownModal />
      <AINotesModal />
      <TaskDetailModal />
      <CreateTaskModal />
      <LoginModal />
      <OnboardingModal />
      <InviteModal />
      <WorkspaceSettingsModal />
      <QuickStartSteps />
      <CommandPalette />
      <ProductWalkthrough />
    </div>
  );
}
