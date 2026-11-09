'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { X, Plus, Loader2 } from 'lucide-react';
import { Priority, PRIORITY_CONFIG } from '@/types';

export const CreateTaskModal: React.FC = () => {
  const {
    isCreateTaskOpen,
    setCreateTaskOpen,
    selectedColumnForCreate,
    currentBoard,
    currentWorkspace,
    currentUser,
    addTask,
  } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [columnId, setColumnId] = useState(selectedColumnForCreate || 'col-todo');
  const [loading, setLoading] = useState(false);

  if (!isCreateTaskOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentBoard) return;

    setLoading(true);
    try {
      const task = await api.createTask({
        board_id: currentBoard.id,
        workspace_id: currentWorkspace?.id || '',
        column_id: columnId,
        title: title.trim(),
        description: description.trim(),
        priority,
        assignees: currentUser ? [currentUser.id] : [],
        checklists: [],
      });

      addTask(task);
      setCreateTaskOpen(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo task');
    } finally {
      setLoading(false);
    }
  };

  const columns = currentBoard?.columns || [
    { id: 'col-todo', title: 'To Do', order: 0, color: '#64748b' },
    { id: 'col-inprogress', title: 'In Progress', order: 1, color: '#38bdf8' },
    { id: 'col-review', title: 'In Review', order: 2, color: '#facc15' },
    { id: 'col-done', title: 'Done', order: 3, color: '#22c55e' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            <span>Tạo Task Mới</span>
          </h3>
          <button
            onClick={() => setCreateTaskOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Tiêu đề task *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Cấu hình WebSockets reconnection..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Cột phân loại</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-[#84CC16] focus:outline-none"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Độ ưu tiên</label>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((pKey) => {
                  const conf = PRIORITY_CONFIG[pKey];
                  const isSelected = priority === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setPriority(pKey)}
                      className={`rounded-lg border px-2 py-1.5 text-xs text-center transition cursor-pointer ${
                        isSelected
                          ? conf.activeClass
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {conf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Mô tả công việc</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chi tiết công việc cần hoàn thành..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateTaskOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#D4FF00] px-5 py-2 text-xs font-bold text-slate-950 hover:bg-[#bce000] disabled:opacity-50 transition shadow-xs border border-black/10"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Tạo Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
