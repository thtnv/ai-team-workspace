'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import {
  Sparkles,
  Users,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  FileText,
  Kanban,
  Trophy,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const QuickStartSteps: React.FC = () => {
  const {
    isQuickStartOpen,
    setQuickStartOpen,
    setInviteModalOpen,
    setAIBreakdownOpen,
    setAINotesOpen,
    tasks,
    notes,
    currentWorkspace,
    currentUser,
  } = useStore();

  if (!isQuickStartOpen) return null;

  // Step 1: Team & Invite
  const isStep1Done = Boolean(currentWorkspace && currentWorkspace.members && currentWorkspace.members.length >= 1);
  // Step 2: AI Breakdown
  const isStep2Done = tasks.some((t) => t.ai_generated);
  // Step 3: Drag & Drop to Done
  const isStep3Done = tasks.some((t) => t.column_id === 'col-done');
  // Step 4: AI Notes & Action Items
  const isStep4Done = notes.length > 0;

  const steps = [
    {
      id: 1,
      title: 'Khởi tạo Nhóm & Mời thành viên',
      subtitle: 'Mời đồng đội vào không gian làm việc qua liên kết hoặc email để cùng cộng tác trực tiếp.',
      done: isStep1Done,
      icon: Users,
      badge: 'Cộng tác nhóm',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      actionLabel: 'Mời thành viên',
      action: () => {
        setQuickStartOpen(false);
        setInviteModalOpen(true);
      },
    },
    {
      id: 2,
      title: 'Phân rã tính năng bằng AI Gemini',
      subtitle: 'Nhập User Story (VD: "Đăng nhập Facebook"), AI sẽ tự động phân tích ra danh sách task con kèm Checklist.',
      done: isStep2Done,
      icon: Sparkles,
      badge: 'Google Gemini 3.5',
      badgeColor: 'bg-lime-100 text-lime-900 border-lime-300 font-bold',
      actionLabel: 'Thử AI Phân rã ngay',
      action: () => {
        setQuickStartOpen(false);
        setAIBreakdownOpen(true);
      },
    },
    {
      id: 3,
      title: 'Kéo thả thẻ việc trên Kanban & Ăn mừng',
      subtitle: 'Kéo các thẻ việc sang cột "Done" để hoàn thành và kích hoạt hiệu ứng pháo hoa vinh danh thời gian thực.',
      done: isStep3Done,
      icon: Kanban,
      badge: 'Thời gian thực',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      actionLabel: 'Xem bảng Kanban',
      action: () => {
        setQuickStartOpen(false);
      },
    },
    {
      id: 4,
      title: 'Ghi chép & Tóm tắt biên bản họp bằng AI',
      subtitle: 'Tạo ghi chú thảo luận và để AI tự động trích xuất các Action Items thành thẻ Kanban chỉ với 1 click.',
      done: isStep4Done,
      icon: FileText,
      badge: 'Action Items 1-Click',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      actionLabel: 'Mở Sổ tay AI Notes',
      action: () => {
        setQuickStartOpen(false);
        setAINotesOpen(true);
      },
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4FF00] text-slate-950 font-black text-sm shadow-2xs border border-black/10">
                ⚡
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Hướng dẫn khởi động nhanh (Quick Start)
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Lấy cảm hứng từ quy trình của Linear &amp; Plane — Hoàn thành 4 bước để làm chủ SyncPulse AI.
            </p>
          </div>

          <button
            onClick={() => setQuickStartOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Bar Header */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Tiến độ hoàn thành:</span>
            <span className="font-bold text-slate-900 font-mono">
              {completedCount}/{steps.length} bước ({progressPercent}%)
            </span>
          </div>

          <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 transition ${
                  step.done
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {/* Step check icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {step.done ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-xs">
                      {step.id}
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-slate-900">
                      Bước {step.id}: {step.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[9px] font-bold border ${step.badgeColor}`}
                    >
                      {step.badge}
                    </span>
                    {step.done && (
                      <span className="rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2">
                        Đã xong
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                    {step.subtitle}
                  </p>

                  <button
                    onClick={step.action}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-2xs ${
                      step.done
                        ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{step.actionLabel}</span>
                    <ArrowRight className="h-3 w-3 text-[#D4FF00]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            💡 Mẹo: Bạn có thể mở lại bảng hướng dẫn này bất kỳ lúc nào từ thanh tiêu đề.
          </span>
          <button
            onClick={() => setQuickStartOpen(false)}
            className="rounded-lg bg-white border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
