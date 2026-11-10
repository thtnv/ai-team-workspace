'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Sparkles,
  FileText,
  Loader2,
} from 'lucide-react';
import { TaskDetailModal, CreateTaskModal, AIBreakdownModal, AINotesModal } from './index';
import { PRIORITY_CONFIG } from '@/types';

export default function MemberPage() {
  const router = useRouter();
  const {
    currentUser,
    currentWorkspace,
    tasks,
    setSelectedTaskForDetail,
    setCreateTaskOpen,
    setAIBreakdownOpen,
    setAINotesOpen,
  } = useStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <h1 className="text-lg font-bold text-slate-900 mb-2">Yêu cầu Đăng nhập</h1>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          Vui lòng đăng nhập để xem danh sách công việc được phân công cho bạn.
        </p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang chủ</span>
        </button>
      </div>
    );
  }

  // Filter tasks assigned to current user
  const myTasks = tasks.filter((t) => Array.isArray(t.assignees) && t.assignees.includes(currentUser.id));

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
            <span className="rounded bg-sky-100 border border-sky-300 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
              MEMBER
            </span>
            <h1 className="text-sm font-bold text-slate-900">
              Công việc của tôi: {currentUser.full_name} ({currentWorkspace?.name})
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAINotesOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            <span>AI Notes</span>
          </button>
          <button
            onClick={() => setAIBreakdownOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#D4FF00] px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-[#bce000] transition cursor-pointer border border-black/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Breakdown</span>
          </button>
          <button
            onClick={() => setCreateTaskOpen(true, 'col-todo')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Tạo Task</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Đầu việc được phân công cho bạn</h2>
              <p className="text-xs text-slate-500">Các thẻ việc bạn là người phụ trách chính (Assignee)</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {myTasks.length} công việc
            </span>
          </div>

          {myTasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 mb-1">Hiện chưa có thẻ việc nào được gán cho bạn</p>
              <p className="text-[11px] text-slate-400 mb-4">
                Bạn có thể mở một thẻ việc trên Bảng và chọn &quot;Gán cho tôi&quot; hoặc bấm nút bên dưới.
              </p>
              <button
                onClick={() => router.push('/')}
                className="py-2 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Xem Bảng việc chung
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.map((t) => {
                const pConfig = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                const isDone = t.column_id === 'col-done';
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskForDetail(t)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      <div>
                        <p className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {t.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-md">{t.description || 'Không có mô tả'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pConfig.boxClass}`}>
                        {pConfig.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.checklists?.filter((st) => st.is_done).length || 0}/{t.checklists?.length || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        <TaskDetailModal />
        <CreateTaskModal />
        <AIBreakdownModal />
        <AINotesModal />
      </main>
    </div>
  );
}
