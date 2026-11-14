'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import {
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Share2,
} from 'lucide-react';

export const AIDailyStandupModal: React.FC = () => {
  const {
    isStandupModalOpen,
    setStandupModalOpen,
    currentBoard,
    currentWorkspace,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{
    date: string;
    summary: string;
    done: string[];
    in_progress: string[];
    blockers: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStandup = async () => {
    if (!currentBoard) return;
    setLoading(true);
    try {
      const data = await api.generateStandup(currentBoard.id);
      setReport(data);
    } catch (err) {
      console.warn('Could not generate standup:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStandupModalOpen && currentBoard) {
      fetchStandup();
    }
  }, [isStandupModalOpen, currentBoard]);

  if (!isStandupModalOpen || !currentBoard) return null;

  const handleCopy = () => {
    if (!report) return;
    const text = `📋 [BÁO CÁO DAILY STANDUP - ${report.date}]
Không gian: ${currentWorkspace?.name} | Bảng: ${currentBoard.title}

✅ ĐÃ HOÀN THÀNH (Hôm qua):
${report.done.map((d) => `• ${d}`).join('\n')}

🚀 ĐANG TRIỂN KHAI (Hôm nay):
${report.in_progress.map((p) => `• ${p}`).join('\n')}

⚠️ RÀO CẢN / KHẨN CẤP:
${report.blockers.map((b) => `• ${b}`).join('\n')}

💡 Tóm tắt AI: ${report.summary}
---
Sinh tự động bởi SyncPulse AI`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-[#D4FF00] font-black shadow-2xs">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Báo cáo Daily Standup AI</h2>
                <span className="rounded bg-[#D4FF00] px-1.5 py-0.2 text-[9px] font-black text-slate-950">
                  AUTO
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Tự động tổng hợp từ bảng: {currentBoard.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStandupModalOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-800" />
              <p className="text-xs font-bold text-slate-700">Gemini đang phân tích tiến độ Sprint...</p>
              <p className="text-[11px] text-slate-400">Đang quét các thẻ việc Done, In Progress và rủi ro.</p>
            </div>
          ) : report ? (
            <>
              {/* Summary Callout */}
              <div className="p-3.5 rounded-xl bg-[#D4FF00]/15 border border-[#bce000] text-xs text-slate-900 leading-relaxed font-medium">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-slate-950">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Tổng quan từ AI ({report.date}):</span>
                </p>
                {report.summary}
              </div>

              {/* 1. Done */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>1. Đã hoàn thành (Done):</span>
                </div>
                <div className="space-y-1 pl-5">
                  {report.done.map((item, idx) => (
                    <p key={idx} className="text-xs text-slate-700 list-item">
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              {/* 2. In Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                  <Clock className="h-4 w-4 text-sky-600" />
                  <span>2. Đang triển khai (In Progress):</span>
                </div>
                <div className="space-y-1 pl-5">
                  {report.in_progress.map((item, idx) => (
                    <p key={idx} className="text-xs text-slate-700 list-item">
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              {/* 3. Blockers */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>3. Khẩn cấp & Rào cản (Blockers / Risks):</span>
                </div>
                <div className="space-y-1 pl-5">
                  {report.blockers.map((item, idx) => (
                    <p key={idx} className="text-xs text-slate-700 list-item">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500 text-center py-8">
              Không thể tải báo cáo. Vui lòng bấm tạo lại.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={fetchStandup}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tạo lại</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!report || loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#D4FF00]" />
                <span>Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#D4FF00]" />
                <span>Sao chép báo cáo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
