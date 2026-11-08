'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  X,
  Trash2,
  CheckSquare,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Task, Priority, Subtask } from '@/types';

export const TaskDetailModal: React.FC = () => {
  const {
    selectedTaskForDetail,
    setSelectedTaskForDetail,
    updateTask,
    deleteTask,
    currentBoard,
  } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [checklists, setChecklists] = useState<Subtask[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedTaskForDetail) {
      setTitle(selectedTaskForDetail.title);
      setDescription(selectedTaskForDetail.description || '');
      setPriority(selectedTaskForDetail.priority);
      setTags(selectedTaskForDetail.tags || []);
      setChecklists(selectedTaskForDetail.checklists || []);
    }
  }, [selectedTaskForDetail]);

  if (!selectedTaskForDetail) return null;

  const handleClose = () => {
    if (currentBoard?.id && selectedTaskForDetail) {
      socketService.emitUnlockTask(currentBoard.id, selectedTaskForDetail.id);
    }
    setSelectedTaskForDetail(null);
  };

  const handleToggleChecklist = async (index: number) => {
    const updated = [...checklists];
    updated[index].is_done = !updated[index].is_done;
    setChecklists(updated);
    await handleSave({ checklists: updated });
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    const item: Subtask = {
      id: `chk-${Date.now()}`,
      title: newChecklistTitle.trim(),
      is_done: false,
    };
    const updated = [...checklists, item];
    setChecklists(updated);
    setNewChecklistTitle('');
    await handleSave({ checklists: updated });
  };

  const handleDeleteChecklist = async (index: number) => {
    const updated = checklists.filter((_, i) => i !== index);
    setChecklists(updated);
    await handleSave({ checklists: updated });
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const handleSave = async (overrideData?: Partial<Task>) => {
    if (!selectedTaskForDetail) return;
    setSaving(true);
    try {
      const updates: Partial<Task> = {
        title,
        description,
        priority,
        tags,
        checklists,
        ...overrideData,
      };
      const result = await api.updateTask(selectedTaskForDetail.id, updates);
      updateTask(result);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa task này không?')) return;
    try {
      await api.deleteTask(selectedTaskForDetail.id);
      deleteTask(selectedTaskForDetail.id);
      handleClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa task');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col max-h-[90vh] w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500">{selectedTaskForDetail.id}</span>
            {selectedTaskForDetail.ai_generated && (
              <span className="inline-flex items-center gap-1 rounded bg-[#D4FF00]/40 border border-[#bce000] px-2 py-0.5 text-[10px] font-extrabold text-slate-950">
                <Sparkles className="h-2.5 w-2.5" />
                <span>AI Generated</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
              title="Xóa task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Title input */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tiêu đề công việc:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSave()}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-base font-bold text-slate-900 focus:bg-white focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          {/* Priority & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Độ ưu tiên:
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  const p = e.target.value as Priority;
                  setPriority(p);
                  handleSave({ priority: p });
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-[#84CC16] focus:outline-none"
              >
                <option value="low">Thấp (Low)</option>
                <option value="medium">Vừa (Medium)</option>
                <option value="high">Cao (High)</option>
                <option value="urgent">Khẩn cấp (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Gắn nhãn (Tags):
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Gõ tag & Enter..."
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-[#84CC16] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Thêm
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs text-slate-700 font-mono font-medium"
                  >
                    #{t}
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="text-slate-400 hover:text-rose-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Mô tả chi tiết & Tiêu chí nghiệm thu:
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleSave()}
              placeholder="Ghi chú chi tiết công việc..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          {/* Checklists */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>Danh sách Checklist ({checklists.filter((c) => c.is_done).length}/{checklists.length})</span>
              </label>
            </div>

            <div className="space-y-2 mb-3">
              {checklists.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={c.is_done}
                      onChange={() => handleToggleChecklist(idx)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                    <span
                      className={`text-xs font-medium ${
                        c.is_done ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {c.title}
                    </span>
                  </label>

                  <button
                    onClick={() => handleDeleteChecklist(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklist())}
                placeholder="Thêm mục checklist mới..."
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-[#84CC16] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                className="flex items-center gap-1 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-[11px] text-slate-500">
            {saving ? 'Đang tự động lưu...' : 'Thay đổi được đồng bộ thời gian thực'}
          </span>
          <button
            onClick={handleClose}
            className="rounded-xl bg-[#D4FF00] px-5 py-2 text-xs font-bold text-slate-950 hover:bg-[#bce000] transition cursor-pointer shadow-xs border border-black/10"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
