'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
  ArrowLeft,
  Eye,
  Shield,
  Layers,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { ViewerBanner } from './ViewerBanner';
import { PRIORITY_CONFIG } from '@/types';

export default function ViewerPage() {
  const router = useRouter();
  const { currentUser, currentWorkspace, tasks, currentBoard } = useStore();
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

  const todoTasks = tasks.filter((t) => t.column_id === 'col-todo');
  const inProgressTasks = tasks.filter((t) => t.column_id === 'col-inprogress');
  const reviewTasks = tasks.filter((t) => t.column_id === 'col-review');
  const doneTasks = tasks.filter((t) => t.column_id === 'col-done');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ViewerBanner />

      {/* Header */}
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
            <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
              VIEWER
            </span>
            <h1 className="text-sm font-bold text-slate-900">
              Chế độ Quan sát: {currentWorkspace?.name} - {currentBoard?.title || 'Bảng công việc'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Eye className="h-4 w-4 text-slate-400" />
          <span>Tổng số {tasks.length} thẻ việc (Chỉ xem)</span>
        </div>
      </header>

      {/* Read-only 4 columns overview */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* To Do */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-700">To Do</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {todoTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {todoTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-800">{t.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.description || 'Không có mô tả'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-sky-700">In Progress</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {inProgressTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-sky-200 bg-sky-50/30">
                  <p className="text-xs font-bold text-slate-800">{t.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.description || 'Không có mô tả'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* In Review */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-amber-700">In Review</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {reviewTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {reviewTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/30">
                  <p className="text-xs font-bold text-slate-800">{t.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.description || 'Không có mô tả'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Done */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-emerald-700">Done</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {doneTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {doneTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30">
                  <p className="text-xs font-bold text-slate-800 line-through text-slate-500">{t.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.description || 'Không có mô tả'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
