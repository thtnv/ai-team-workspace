'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  Users,
  Rocket,
  KeyRound,
  Compass,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  FolderKanban,
  ArrowRight,
  X,
  FileText
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const {
    currentUser,
    workspaces,
    isOnboardingOpen,
    setOnboardingOpen,
    setWorkspaces,
    setCurrentWorkspace,
    setBoards,
    setCurrentBoard,
    setTasks,
    setNotes,
  } = useStore();

  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Create workspace state (Leader)
  const [workspaceName, setWorkspaceName] = useState('');
  const [boardTitle, setBoardTitle] = useState('Sprint 1 - Khởi động dự án');
  const [description, setDescription] = useState('');

  // Join workspace state (Member)
  const [inviteCode, setInviteCode] = useState('');

  // Loading & feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOnboardingOpen) return null;

  const loadWorkspaceDetails = async (workspace: any) => {
    try {
      const allWorkspaces = await api.getWorkspaces();
      setWorkspaces(allWorkspaces);
      setCurrentWorkspace(workspace);

      const boards = await api.getWorkspaceBoards(workspace.id);
      setBoards(boards);
      const activeBoard = boards[0];
      setCurrentBoard(activeBoard);

      if (activeBoard) {
        const boardTasks = await api.getBoardTasks(activeBoard.id);
        setTasks(boardTasks);

        if (currentUser) {
          socketService.joinBoard(activeBoard.id, {
            id: currentUser.id,
            name: currentUser.full_name,
            email: currentUser.email,
            avatar_url: currentUser.avatar_url,
          });
        }
      }

      const notes = await api.getNotes(workspace.id);
      setNotes(notes);

      setOnboardingOpen(false);
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi khi tải thông tin không gian làm việc.');
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!workspaceName.trim()) {
      setErrorMsg('Vui lòng nhập tên Nhóm hoặc Công ty của bạn.');
      return;
    }

    setLoading(true);
    try {
      const newWs = await api.createOnboardingWorkspace(
        workspaceName.trim(),
        boardTitle.trim(),
        description.trim()
      );
      setSuccessMsg(`Đã tạo nhóm "${newWs.name}"!`);
      await loadWorkspaceDetails(newWs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!inviteCode.trim()) {
      setErrorMsg('Vui lòng nhập Mã mời từ Nhóm trưởng.');
      return;
    }

    setLoading(true);
    try {
      const joinedWs = await api.joinWorkspace(inviteCode.trim());
      setSuccessMsg(`Đã gia nhập nhóm "${joinedWs.name}"!`);
      await loadWorkspaceDetails(joinedWs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã mời không đúng hoặc nhóm không tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDemo = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const demoWs = await api.joinDemoWorkspace();
      setSuccessMsg('Đã kết nối vào nhóm mẫu thành công!');
      await loadWorkspaceDetails(demoWs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải dữ liệu mẫu.');
    } finally {
      setLoading(false);
    }
  };

  const canClose = workspaces.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col my-auto max-h-[88vh]">
        {/* Close button if user already belongs to a workspace */}
        {canClose && (
          <button
            onClick={() => setOnboardingOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Compact Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 pt-3.5 pb-2.5 text-center shrink-0">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4FF00] shadow-2xs mb-1 border border-black/10">
            <Rocket className="h-4 w-4 text-slate-950" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Thiết lập Không gian làm việc</h2>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto line-clamp-1">
            Chào mừng {currentUser?.full_name?.split(' ')[0] || 'bạn'}! Hãy tạo nhóm mới hoặc gia nhập nhóm.
          </p>

          {/* Compact Tab Switcher */}
          <div className="mt-2.5 flex rounded-lg bg-slate-200/70 p-0.5">
            <button
              type="button"
              onClick={() => {
                setTab('create');
                setErrorMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                tab === 'create'
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3 w-3 text-emerald-600" />
              Tạo Nhóm Mới (Leader)
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('join');
                setErrorMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                tab === 'join'
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-3 w-3 text-amber-500" />
              Gia nhập Nhóm (Member)
            </button>
          </div>
        </div>

        {/* Compact Form Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          {errorMsg && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 p-2 text-[11px] text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-[11px] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreateWorkspace} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Tên Nhóm / Công ty <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="VD: AI Tech Squad, Nhóm Đồ Án..."
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Tên Bảng Kanban ban đầu
                </label>
                <div className="relative">
                  <FolderKanban className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Sprint 1 - Khởi động dự án"
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Mô tả mục tiêu (Không bắt buộc)
                </label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Mục tiêu ngắn của sprint hoặc nhóm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <Rocket className="h-3.5 w-3.5 text-[#D4FF00]" />
                    Khởi tạo Không gian & Bắt đầu
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinWorkspace} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Mã mời (Workspace Code hoặc Slug) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Dán mã mời từ Nhóm trưởng (VD: ws-xxxxxx)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden font-mono"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Nhóm trưởng có thể lấy mã mời này từ nút <strong>"+ Mời"</strong> trên Navbar.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <Users className="h-3.5 w-3.5 text-[#D4FF00]" />
                    Gia nhập Nhóm
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Access Bar */}
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 text-[10px]">
              Dành cho Người kiểm thử / Đánh giá:
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={handleJoinDemo}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-950 underline underline-offset-2 transition cursor-pointer"
            >
              <Compass className="h-3 w-3 text-amber-500" />
              Xem dữ liệu mẫu (Sprint 24)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
