'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  Users,
  Sparkles,
  Rocket,
  KeyRound,
  Compass,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  FolderKanban,
  ArrowRight
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const {
    currentUser,
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
      setSuccessMsg(`Đã khởi tạo không gian "${newWs.name}" thành công!`);
      await loadWorkspaceDetails(newWs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo không gian làm việc. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!inviteCode.trim()) {
      setErrorMsg('Vui lòng nhập Mã mời hoặc Workspace ID từ Nhóm trưởng.');
      return;
    }

    setLoading(true);
    try {
      const joinedWs = await api.joinWorkspace(inviteCode.trim());
      setSuccessMsg(`Đã gia nhập nhóm "${joinedWs.name}" thành công!`);
      await loadWorkspaceDetails(joinedWs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã mời không hợp lệ hoặc nhóm không tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinDemo = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const demoWs = await api.joinDemoWorkspace();
      setSuccessMsg('Đã kết nối vào Không gian làm việc mẫu thành công!');
      await loadWorkspaceDetails(demoWs);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải dữ liệu mẫu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/60 p-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4FF00] shadow-sm mb-3">
            <Rocket className="h-6 w-6 text-slate-950" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Thiết lập Không gian làm việc</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Chào mừng {currentUser?.full_name || 'bạn'}! Bạn đang là Trưởng nhóm muốn tạo dự án mới, hay là thành viên gia nhập nhóm?
          </p>

          {/* Tab Switcher */}
          <div className="mt-4 flex rounded-xl bg-slate-200/80 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('create');
                setErrorMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === 'create'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              Tạo Nhóm Mới (Nhóm trưởng)
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('join');
                setErrorMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === 'join'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-500" />
              Gia nhập Nhóm (Thành viên)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Nhóm / Công ty <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="VD: AI Tech Squad, Nhóm Đồ Án Tốt Nghiệp..."
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Bảng Kanban ban đầu
                </label>
                <div className="relative">
                  <FolderKanban className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Sprint 1 - Khởi động dự án"
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Hệ thống sẽ tự động tạo bảng Kanban với 4 cột chuẩn: To Do, In Progress, In Review, Done.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mục tiêu ngắn của nhóm (Không bắt buộc)
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả mục tiêu sản phẩm hoặc sprint hiện tại..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 focus:outline-hidden transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang khởi tạo không gian...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 text-[#D4FF00]" />
                    Khởi tạo Không gian & Mời thành viên
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã mời (Workspace ID hoặc Slug) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="VD: ws-acme-eng hoặc dán mã mời từ Nhóm trưởng"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Nhóm trưởng của bạn có thể lấy mã mời này từ nút <strong>"+ Mời"</strong> trên thanh Navbar.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 focus:outline-hidden transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang kiểm tra mã mời...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 text-[#D4FF00]" />
                    Gia nhập Không gian làm việc
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Access Divider for Interviewers / Testers */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Bạn là Nhà tuyển dụng / Người kiểm thử?
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={handleJoinDemo}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 underline underline-offset-2 transition-colors cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 text-amber-500" />
              Khám phá dữ liệu mẫu (Sprint 24)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
