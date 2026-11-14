'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import {
  X,
  Plus,
  Calendar,
  Layers,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderKanban,
} from 'lucide-react';

export const CreateSprintModal: React.FC = () => {
  const {
    isCreateSprintOpen,
    setCreateSprintOpen,
    currentWorkspace,
    addBoardToStore,
    setCurrentBoard,
    setTasks,
  } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationWeeks, setDurationWeeks] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isCreateSprintOpen || !currentWorkspace) return null;

  const handleDurationSelect = (weeks: number) => {
    setDurationWeeks(weeks);
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + weeks * 7);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên Sprint.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const newBoard = await api.createBoard({
        workspace_id: currentWorkspace.id,
        title: title.trim(),
        description: description.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      addBoardToStore(newBoard);
      setCurrentBoard(newBoard);
      setTasks([]); // Fresh board has empty tasks initially

      setCreateSprintOpen(false);
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo Sprint mới.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-[#D4FF00] font-black shadow-2xs">
              <FolderKanban className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Khởi tạo Sprint mới</h2>
              <p className="text-[11px] text-slate-500">Chu kỳ làm việc mới cho {currentWorkspace.name}</p>
            </div>
          </div>
          <button
            onClick={() => setCreateSprintOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên Sprint <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Sprint 2 - Tối ưu hóa & Đa nền tảng"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Thời lượng chu kỳ (Sprint Duration)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => handleDurationSelect(weeks)}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    durationWeeks === weeks
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {weeks === 1 ? '1 tuần' : weeks === 2 ? '2 tuần (Chuẩn)' : '1 tháng'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mục tiêu của Sprint (Sprint Goal)
            </label>
            <textarea
              rows={2}
              placeholder="VD: Hoàn thành tích hợp thanh toán và kiểm thử bảo mật..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden resize-none"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setCreateSprintOpen(false)}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-[#D4FF00]" />
                  <span>Tạo Sprint & Mở Bảng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
