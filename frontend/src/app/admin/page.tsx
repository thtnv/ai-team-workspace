'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import {
  ShieldAlert,
  ArrowLeft,
  Building2,
  Users,
  Settings,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { WorkspaceSettingsModal, InviteModal } from './index';

export default function AdminPage() {
  const router = useRouter();
  const {
    currentUser,
    currentWorkspace,
    setCurrentWorkspace,
    setWorkspaceSettingsOpen,
    setInviteModalOpen,
  } = useStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-open workspace settings when navigating to /admin
    setWorkspaceSettingsOpen(true);
  }, [setWorkspaceSettingsOpen]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const isOwner = Boolean(currentUser && currentWorkspace && currentUser.id === currentWorkspace.owner_id);
  const currentMember = currentWorkspace?.members?.find((m) => m.user_id === currentUser?.id);
  const isAdmin = Boolean(isOwner || currentMember?.role === 'admin');

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 mb-4 text-amber-600 shadow-xs">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">Yêu cầu Đăng nhập Quản trị</h1>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Vui lòng đăng nhập tài khoản Quản trị viên để truy cập trang quản lý không gian làm việc.
        </p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang chủ đăng nhập</span>
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 mb-4 text-rose-600 shadow-xs">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">Quyền truy cập bị giới hạn (403)</h1>
        <p className="text-xs text-slate-600 max-w-md mb-6 leading-relaxed">
          Tài khoản <span className="font-bold text-slate-900">{currentUser.full_name}</span> ({currentUser.email}) đang ở vai trò{' '}
          <span className="font-bold text-slate-900">{currentMember?.role === 'viewer' ? 'Quan sát viên' : 'Thành viên'}</span>.
          Chỉ Quản trị viên (Admin) hoặc Trưởng nhóm mới có quyền truy cập khu vực này.
        </p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Bảng làm việc</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Về Bảng việc</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#D4FF00] px-1.5 py-0.5 text-[10px] font-black text-slate-950">ADMIN</span>
            <h1 className="text-sm font-bold text-slate-900">Quản trị Không gian: {currentWorkspace?.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
          >
            <Users className="h-3.5 w-3.5 text-slate-600" />
            <span>Mời thành viên</span>
          </button>
          <button
            onClick={() => setWorkspaceSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Mở Cài đặt Không gian</span>
          </button>
        </div>
      </header>

      {/* Main Admin Console Area */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-[#D4FF00]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Khu vực Quản trị Không gian (Admin Console)</h2>
              <p className="text-xs text-slate-500">
                Bạn đang đăng nhập với quyền {isOwner ? 'Trưởng nhóm (Owner)' : 'Quản trị viên (Admin)'}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">Không gian làm việc</p>
              <p className="text-sm font-bold text-slate-900">{currentWorkspace?.name || '---'}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">{currentWorkspace?.slug}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">Tổng thành viên</p>
              <p className="text-sm font-bold text-slate-900">{currentWorkspace?.members?.length || 0} thành viên</p>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="text-[11px] font-bold text-blue-600 hover:underline mt-1 inline-block cursor-pointer"
              >
                + Thêm thành viên mới
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-1">Quyền hạn của bạn</p>
              <span className="inline-block rounded-md bg-[#D4FF00]/30 border border-[#bce000] px-2 py-0.5 text-xs font-bold text-slate-900">
                Toàn quyền quản trị
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Phân quyền, cấu hình AI, xóa nhóm</p>
            </div>
          </div>
        </div>

        {/* Modals */}
        <WorkspaceSettingsModal />
        <InviteModal />
      </main>
    </div>
  );
}
