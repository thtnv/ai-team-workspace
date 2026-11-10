'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  Users,
  Rocket,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  FolderKanban,
  ArrowRight,
  X,
  FileText,
  Plus,
  Check,
  Layers,
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const {
    currentUser,
    isOnboardingOpen,
    setOnboardingOpen,
    workspaces,
    setWorkspaces,
    currentWorkspace,
    setCurrentWorkspace,
    setBoards,
    setCurrentBoard,
    setTasks,
    setNotes,
  } = useStore();

  const hasWorkspaces = Boolean(workspaces && workspaces.length > 0);
  const [tab, setTab] = useState<'switch' | 'create' | 'join'>('switch');

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

  // Open appropriate tab on open
  useEffect(() => {
    if (isOnboardingOpen) {
      if (workspaces && workspaces.length > 0) {
        setTab('switch');
      } else {
        setTab('create');
      }
    }
  }, [isOnboardingOpen, workspaces]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOnboardingOpen(false);
      }
    };
    if (isOnboardingOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOnboardingOpen, setOnboardingOpen]);

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

      // Close modal immediately after successful load
      setOnboardingOpen(false);
      setSuccessMsg('');
      setErrorMsg('');
      setWorkspaceName('');
      setInviteCode('');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setOnboardingOpen(false);
        }
      }}
    >
      <div className="relative w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* ALWAYS VISIBLE CLOSE BUTTON (X) */}
        <button
          type="button"
          onClick={() => {
            setOnboardingOpen(false);
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
          title="Đóng (Esc)"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 pt-4 pb-3 text-center shrink-0">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4FF00] shadow-2xs mb-1.5 border border-black/10">
            <Rocket className="h-4.5 w-4.5 text-slate-950" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Không gian làm việc (Workspaces)</h2>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto line-clamp-1 mt-0.5">
            {hasWorkspaces
              ? `Bạn đang tham gia ${workspaces.length} không gian làm việc. Chọn để chuyển đổi ngay.`
              : `Chào mừng ${currentUser?.full_name?.split(' ')[0] || 'bạn'}! Hãy tạo nhóm mới hoặc gia nhập nhóm.`}
          </p>

          {/* Tab Switcher */}
          <div className="mt-3 flex rounded-xl bg-slate-200/70 p-0.5 text-xs font-bold">
            {hasWorkspaces && (
              <button
                type="button"
                onClick={() => {
                  setTab('switch');
                  setErrorMsg('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  tab === 'switch'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span>Nhóm của tôi ({workspaces.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setTab('join');
                setErrorMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === 'join'
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-500" />
              <span>Gia nhập nhóm</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('create');
                setErrorMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === 'create'
                  ? 'bg-white text-slate-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              <span>+ Tạo mới</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
          {errorMsg && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'switch' ? (
            <div className="space-y-3">
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
                {workspaces.map((ws) => {
                  const isCurrent = ws.id === currentWorkspace?.id;
                  const member = ws.members?.find((m) => m.user_id === currentUser?.id);
                  const isOwner = currentUser?.id === ws.owner_id;
                  const roleLabel = isOwner
                    ? 'Trưởng nhóm'
                    : member?.role === 'admin'
                    ? 'Quản trị viên'
                    : member?.role === 'viewer'
                    ? 'Quan sát viên'
                    : 'Thành viên';

                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => loadWorkspaceDetails(ws)}
                      disabled={loading}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs shrink-0 ${
                            isCurrent
                              ? 'bg-[#D4FF00] text-slate-950 font-black'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                            {ws.name}
                          </p>
                          <p className={`text-[11px] truncate ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                            {ws.members?.length || 1} thành viên • mã: {ws.slug || ws.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isCurrent
                              ? 'bg-white/20 text-[#D4FF00] border-white/30'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {roleLabel}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#D4FF00] flex items-center gap-0.5">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('join')}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                  <span>Gia nhập nhóm khác</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('create')}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-[#D4FF00]" />
                  <span>Tạo nhóm mới</span>
                </button>
              </div>
            </div>
          ) : tab === 'create' ? (
            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Nhóm / Công ty <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Markee, AI Tech Squad..."
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Bảng Kanban ban đầu
                </label>
                <div className="relative">
                  <FolderKanban className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Sprint 1 - Khởi động dự án"
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả mục tiêu (Không bắt buộc)
                </label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Mục tiêu ngắn của sprint hoặc nhóm..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {hasWorkspaces && (
                  <button
                    type="button"
                    onClick={() => setTab('switch')}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Quay lại
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang khởi tạo...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 text-[#D4FF00]" />
                      Khởi tạo Không gian & Bắt đầu
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoinWorkspace} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã mời (Workspace Code hoặc Slug) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Dán mã mời từ Nhóm trưởng (VD: ws-xxxxxx hoặc slug)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden font-mono"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Nhóm trưởng có thể sao chép mã mời này từ nút <strong>Mời</strong> trên thanh điều hướng.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                {hasWorkspaces && (
                  <button
                    type="button"
                    onClick={() => setTab('switch')}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Quay lại
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 text-[#D4FF00]" />
                      Gia nhập Nhóm
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
