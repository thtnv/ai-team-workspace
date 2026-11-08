'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import {
  FileText,
  Sparkles,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowRight,
  User,
  ListTodo,
  Check,
} from 'lucide-react';
import { Note, ActionItem, NoteSummary } from '@/types';

export const AINotesModal: React.FC = () => {
  const {
    isAINotesOpen,
    setAINotesOpen,
    notes,
    addNote,
    updateNoteInStore,
    currentWorkspace,
    currentBoard,
    addTask,
  } = useStore();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      setSelectedNote(notes[0]);
    }
  }, [notes]);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setRawContent(selectedNote.raw_content);
    } else {
      setTitle('');
      setRawContent('');
    }
  }, [selectedNote]);

  if (!isAINotesOpen) return null;

  const handleCreateNewNote = async () => {
    if (!currentWorkspace) return;
    const newNote = await api.createNote({
      workspace_id: currentWorkspace.id,
      title: 'Biên bản cuộc họp mới',
      raw_content: 'Mục tiêu cuộc họp:\n- \n\nNội dung trao đổi:\n- \n\nPhân công công việc:\n- ',
    });
    addNote(newNote);
    setSelectedNote(newNote);
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    const updated = await api.updateNote(selectedNote.id, {
      title,
      raw_content: rawContent,
    });
    updateNoteInStore(updated);
    setSelectedNote(updated);
  };

  const handleAnalyzeWithAI = async () => {
    if (!rawContent.trim() || !selectedNote) return;

    setAnalyzing(true);
    try {
      await handleSaveNote();
      const summary = await api.summarizeNotes(
        rawContent,
        currentWorkspace?.id,
        selectedNote.id
      );

      const updatedNote: Note = {
        ...selectedNote,
        summary,
      };
      updateNoteInStore(updatedNote);
      setSelectedNote(updatedNote);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi phân tích ghi chú bằng AI');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConvertActionToTask = async (action: ActionItem) => {
    if (!currentBoard || !currentWorkspace || !selectedNote) return;
    setConvertingId(action.id);

    try {
      const task = await api.convertActionToTask({
        workspace_id: currentWorkspace.id,
        board_id: currentBoard.id,
        column_id: 'col-todo',
        action_item: action,
      });

      addTask(task);

      if (selectedNote.summary) {
        const updatedActions = selectedNote.summary.action_items.map((a) =>
          a.id === action.id ? { ...a, is_converted_to_task: true, task_id: task.id } : a
        );
        const updatedSummary: NoteSummary = {
          ...selectedNote.summary,
          action_items: updatedActions,
        };
        const updatedNote = { ...selectedNote, summary: updatedSummary };
        updateNoteInStore(updatedNote);
        setSelectedNote(updatedNote);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi chuyển đổi thành Task');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col h-[90vh] w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                AI Meeting Notes Summarizer
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Ghi chú nội dung cuộc họp thô, AI sẽ tự động trích xuất các quyết định và đầu mục hành động (Action Items).
              </p>
            </div>
          </div>

          <button
            onClick={() => setAINotesOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Two Columns */}
        <div className="flex flex-1 overflow-hidden pt-4 gap-6">
          {/* Left Sidebar: Notes list */}
          <div className="w-64 flex flex-col border-r border-slate-200 pr-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Danh sách biên bản ({notes.length})
              </span>
              <button
                onClick={handleCreateNewNote}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer"
                title="Tạo ghi chú mới"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNote(n)}
                  className={`w-full text-left rounded-xl p-3 text-xs transition cursor-pointer ${
                    selectedNote?.id === n.id
                      ? 'border border-emerald-500 bg-emerald-50/50 text-slate-900 font-bold shadow-2xs'
                      : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="font-bold truncate">{n.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>{n.summary ? '✨ Đã phân tích' : 'Chưa phân tích'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Area: Editor & AI Summary */}
          <div className="flex-1 flex flex-col overflow-y-auto pr-1 space-y-5">
            {selectedNote ? (
              <>
                {/* Note Title & Action Bar */}
                <div className="flex items-center justify-between gap-4">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleSaveNote}
                    placeholder="Tiêu đề cuộc họp..."
                    className="flex-1 text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#84CC16] focus:outline-none px-1 py-1"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNote}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    >
                      Lưu nháp
                    </button>
                    <button
                      disabled={analyzing || !rawContent.trim()}
                      onClick={handleAnalyzeWithAI}
                      className="flex items-center gap-2 rounded-xl bg-[#D4FF00] px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-[#bce000] disabled:opacity-50 cursor-pointer shadow-xs border border-black/10"
                    >
                      {analyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>Phân tích bằng AI</span>
                    </button>
                  </div>
                </div>

                {/* Raw content textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nội dung cuộc họp thô:
                  </label>
                  <textarea
                    rows={6}
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    placeholder="Dán nội dung thảo luận, biên bản cuộc họp vào đây..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/70 p-3.5 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#84CC16] focus:outline-none focus:ring-1 focus:ring-[#84CC16]"
                  />
                </div>

                {/* AI Summary View */}
                {selectedNote.summary && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-5">
                    {/* TL;DR Overview */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        💡 Tổng quan cuộc họp (TL;DR)
                      </span>
                      <p className="mt-1 text-xs text-slate-800 leading-relaxed font-medium">
                        {selectedNote.summary.overview}
                      </p>
                    </div>

                    {/* Key Decisions */}
                    {selectedNote.summary.key_decisions?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          🎯 Các quyết định cốt lõi đã chốt:
                        </span>
                        <div className="grid gap-2">
                          {selectedNote.summary.key_decisions.map((decision, dIdx) => (
                            <div
                              key={dIdx}
                              className="flex items-start gap-2.5 rounded-xl bg-white border border-slate-200 p-2.5 text-xs text-slate-800 font-medium shadow-2xs"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{decision}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Items with 1-Click Convert */}
                    {selectedNote.summary.action_items?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            ⚡ Đầu việc cần làm (Action Items):
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Bấm nút để chuyển thẳng lên Kanban Board
                          </span>
                        </div>

                        <div className="grid gap-2.5">
                          {selectedNote.summary.action_items.map((action) => (
                            <div
                              key={action.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                                  <ListTodo className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">
                                    {action.action}
                                  </p>
                                  <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1 font-medium">
                                      <User className="h-3 w-3 text-slate-400" />
                                      {action.assignee_name || 'Unassigned'}
                                    </span>
                                    <span className="uppercase text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      {action.suggested_priority}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {action.is_converted_to_task ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                                    <Check className="h-3 w-3" />
                                    <span>Đã lên Board</span>
                                  </span>
                                ) : (
                                  <button
                                    disabled={convertingId === action.id}
                                    onClick={() => handleConvertActionToTask(action)}
                                    className="flex items-center gap-1.5 rounded-lg bg-[#D4FF00] px-3.5 py-1 text-xs font-bold text-slate-950 transition hover:bg-[#bce000] disabled:opacity-50 cursor-pointer shadow-xs border border-black/10"
                                  >
                                    {convertingId === action.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ArrowRight className="h-3 w-3" />
                                    )}
                                    <span>Tạo Task</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
                <FileText className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Chọn một biên bản hoặc tạo mới để bắt đầu.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
