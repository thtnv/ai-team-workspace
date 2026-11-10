'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { Sparkles, X, Loader2, Plus, Clock, Check, Lightbulb } from 'lucide-react';
import { TaskBreakdownResponse } from '@/types';

export const AIBreakdownModal: React.FC = () => {
  const {
    isAIBreakdownOpen,
    setAIBreakdownOpen,
    currentBoard,
    currentWorkspace,
    currentUser,
    addTask,
  } = useStore();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [result, setResult] = useState<TaskBreakdownResponse | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  if (!isAIBreakdownOpen) return null;

  const samplePrompts = [
    'Tích hợp đăng nhập bằng Google OAuth và quản lý session',
    'Xây dựng hệ thống thanh toán gói cước theo tháng với Stripe',
    'Tính năng tải lên tệp đính kèm và ảnh avatar lên Cloud Storage',
    'Tối ưu hóa hiệu năng kéo thả thời gian thực và giảm giật lag',
  ];

  const handleBreakdown = async (inputPrompt?: string) => {
    const textToSubmit = inputPrompt || prompt;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const data = await api.breakdownTask(
        textToSubmit,
        currentWorkspace?.id,
        currentBoard?.id
      );
      setResult(data);
      setSelectedIndices(data.tasks.map((_, i) => i));
    } catch (error: any) {
      alert(error.message || 'Lỗi khi gọi AI Breakdown');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSelectedToBoard = async () => {
    if (!result || !currentBoard) return;
    setAddingAll(true);

    try {
      const tasksToAdd = result.tasks.filter((_, idx) => selectedIndices.includes(idx));
      for (const t of tasksToAdd) {
        const newTask = await api.createTask({
          board_id: currentBoard.id,
          workspace_id: currentWorkspace?.id || '',
          column_id: 'col-todo',
          title: t.title,
          description: t.description,
          priority: t.priority,
          tags: t.tags,
          checklists: t.checklists.map((c, i) => ({
            id: `chk-${Date.now()}-${i}`,
            title: c.title,
            is_done: false,
          })),
          ai_generated: true,
          assignees: currentUser ? [currentUser.id] : [],
        });
        addTask(newTask);
      }
      setAIBreakdownOpen(false);
      setResult(null);
      setPrompt('');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu task vào Board');
    } finally {
      setAddingAll(false);
    }
  };

  const toggleSelect = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col max-h-[90vh] w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4FF00] text-slate-950 font-bold border border-black/10">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                AI Task Breakdown <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 border border-emerald-200">Gemini 3.5</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Nhập yêu cầu lớn (User Story), AI sẽ tự động phân rã thành các task kỹ thuật cụ thể kèm checklist.
              </p>
            </div>
          </div>

          <button
            onClick={() => setAIBreakdownOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Input & Suggested chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Mô tả tính năng hoặc yêu cầu kỹ thuật:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBreakdown()}
                placeholder="VD: Làm tính năng đăng nhập bằng Google và phân quyền người dùng..."
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#84CC16] focus:outline-none focus:ring-1 focus:ring-[#84CC16]"
              />
              <button
                disabled={loading || !prompt.trim()}
                onClick={() => handleBreakdown()}
                className="flex items-center gap-2 rounded-xl bg-[#D4FF00] px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-[#bce000] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs border border-black/10"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>Phân rã</span>
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 py-0.5 font-medium">Gợi ý nhanh:</span>
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPrompt(p);
                    handleBreakdown(p);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1 text-[11px] text-slate-600 hover:border-slate-400 hover:text-slate-900 transition cursor-pointer font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                Trợ lý Gemini đang phân tích kiến trúc và sinh checklist chi tiết...
              </p>
              <p className="text-xs text-slate-500">
                Tự động suy luận số giờ ước tính, độ ưu tiên và các bước kiểm thử.
              </p>
            </div>
          )}

          {/* AI Result Presentation */}
          {result && !loading && (
            <div className="space-y-4 pt-2">
              {/* Architecture Summary */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Tóm tắt kiến trúc phân rã</span>
                </span>
                <p className="mt-1 text-xs text-slate-700 leading-relaxed font-medium">
                  {result.summary}
                </p>
              </div>

              {/* Tasks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Danh sách {result.tasks.length} task đề xuất:</span>
                  <span>Đã chọn ({selectedIndices.length}/{result.tasks.length})</span>
                </div>

                {result.tasks.map((task, idx) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {task.title}
                            </h4>
                            <p className="mt-1 text-xs text-slate-600">
                              {task.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {task.priority}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <Clock className="h-3 w-3" />
                            {task.estimated_hours}h
                          </span>
                        </div>
                      </div>

                      {/* Checklist items preview */}
                      {task.checklists && task.checklists.length > 0 && (
                        <div className="mt-3 rounded-lg bg-white p-2.5 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Checklist thực hiện:
                          </span>
                          {task.checklists.map((c, cIdx) => (
                            <div key={cIdx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span>{c.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {result ? `Sẵn sàng thêm ${selectedIndices.length} task vào cột To Do` : 'Được hỗ trợ bởi Google Gemini 3.8'}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setAIBreakdownOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Đóng
            </button>
            {result && (
              <button
                disabled={addingAll || selectedIndices.length === 0}
                onClick={handleAddSelectedToBoard}
                className="flex items-center gap-2 rounded-xl bg-[#D4FF00] px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#bce000] disabled:opacity-50 cursor-pointer shadow-sm border border-black/10"
              >
                {addingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Thêm {selectedIndices.length} Task vào Kanban</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
