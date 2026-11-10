'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  X,
  Trash2,
  CheckSquare,
  Plus,
  Sparkles,
  MessageSquare,
  Send,
  Clock,
  User as UserIcon,
  Loader2,
  Users,
  UserPlus,
  UserCheck,
  Check,
} from 'lucide-react';
import { Task, Priority, Subtask, TaskComment, PRIORITY_CONFIG, WorkspaceMember } from '@/types';

function formatRelativeTime(isoString?: string) {
  if (!isoString) return 'Vừa xong';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 45) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Gần đây';
  }
}

export const TaskDetailModal: React.FC = () => {
  const {
    selectedTaskForDetail,
    setSelectedTaskForDetail,
    updateTask,
    deleteTask,
    currentBoard,
    currentWorkspace,
    currentUser,
    addTaskComment,
  } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [checklists, setChecklists] = useState<Subtask[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  const comments = selectedTaskForDetail?.comments || [];

  // Close assignee dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const workspaceMembersList: WorkspaceMember[] = useMemo(() => {
    const list = currentWorkspace?.members ? [...currentWorkspace.members] : [];
    if (currentUser && !list.some((m) => m.user_id === currentUser.id)) {
      list.unshift({
        user_id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.full_name,
        role: 'admin',
        avatar_url: currentUser.avatar_url,
      });
    }
    return list;
  }, [currentWorkspace?.members, currentUser]);

  const assignedMembers = useMemo(() => {
    return assignees
      .map((id) => workspaceMembersList.find((m) => m.user_id === id))
      .filter((m): m is WorkspaceMember => Boolean(m));
  }, [assignees, workspaceMembersList]);

  const handleToggleAssignee = async (userId: string) => {
    let nextAssignees: string[];
    if (assignees.includes(userId)) {
      nextAssignees = assignees.filter((id) => id !== userId);
    } else {
      nextAssignees = [...assignees, userId];
    }
    setAssignees(nextAssignees);
    await handleSave({ assignees: nextAssignees });
  };

  const handleAssignToMe = async () => {
    if (!currentUser) return;
    if (assignees.includes(currentUser.id)) return;
    const nextAssignees = [...assignees, currentUser.id];
    setAssignees(nextAssignees);
    await handleSave({ assignees: nextAssignees });
  };

  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim() || !selectedTaskForDetail || sendingComment) return;

    const content = commentInput.trim();
    setSendingComment(true);
    try {
      const newComment = await api.addTaskComment(selectedTaskForDetail.id, content);
      addTaskComment(selectedTaskForDetail.id, newComment);
      setCommentInput('');
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi bình luận');
    } finally {
      setSendingComment(false);
    }
  };

  useEffect(() => {
    if (selectedTaskForDetail) {
      setTitle(selectedTaskForDetail.title);
      setDescription(selectedTaskForDetail.description || '');
      setPriority(selectedTaskForDetail.priority);
      setTags(selectedTaskForDetail.tags || []);
      setChecklists(selectedTaskForDetail.checklists || []);
      setAssignees(selectedTaskForDetail.assignees || []);
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
        assignees,
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

          {/* Phân công thành viên (Assignees) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-700" />
                <span>Người thực hiện (Assignees)</span>
              </label>

              {/* Quick "Assign to me" button if current user is not assigned */}
              {currentUser && !assignees.includes(currentUser.id) && (
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition cursor-pointer shadow-2xs"
                  title="Nhận việc này cho chính bạn (Assign to me)"
                >
                  <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Gán cho tôi</span>
                </button>
              )}
            </div>

            {/* List of currently assigned members + Add button */}
            <div className="flex items-center gap-2 flex-wrap">
              {assignedMembers.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  Chưa phân công cho ai (Unassigned)
                </span>
              ) : (
                assignedMembers.map((m) => (
                  <div
                    key={m.user_id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white pl-1 pr-2 py-0.5 text-xs text-slate-800 shadow-2xs"
                  >
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={m.full_name}
                        referrerPolicy="no-referrer"
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[#D4FF00] text-[9px] font-black">
                        {(m.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-[11px]">{m.full_name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAssignee(m.user_id)}
                      className="ml-0.5 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition cursor-pointer"
                      title="Gỡ bỏ phân công"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}

              {/* Dropdown Button to Add/Change Members */}
              <div className="relative" ref={assigneeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  <UserPlus className="h-3 w-3 text-slate-500" />
                  <span>+ Phân công</span>
                </button>

                {isAssigneeDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl space-y-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                      Thành viên trong nhóm ({workspaceMembersList.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                      {workspaceMembersList.map((mem) => {
                        const isAssigned = assignees.includes(mem.user_id);
                        return (
                          <button
                            key={mem.user_id}
                            type="button"
                            onClick={() => handleToggleAssignee(mem.user_id)}
                            className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition cursor-pointer ${
                              isAssigned
                                ? 'bg-slate-100 text-slate-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-50 font-normal'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {mem.avatar_url ? (
                                <img
                                  src={mem.avatar_url}
                                  alt={mem.full_name}
                                  referrerPolicy="no-referrer"
                                  className="h-6 w-6 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[#D4FF00] text-[10px] font-black shrink-0">
                                  {(mem.full_name || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold leading-tight">
                                  {mem.full_name}
                                </p>
                                <p className="truncate text-[10px] text-slate-400 font-mono">
                                  {mem.email}
                                </p>
                              </div>
                            </div>
                            {isAssigned && (
                              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority & Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Độ ưu tiên:
              </label>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((pKey) => {
                  const conf = PRIORITY_CONFIG[pKey];
                  const isSelected = priority === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => {
                        setPriority(pKey);
                        handleSave({ priority: pKey });
                      }}
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

          {/* Comments Section (Plane & Linear Real-time Task Comments) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-700" />
                <span>Thảo luận &amp; Bình luận ({comments.length})</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Đồng bộ WebSockets tức thì</span>
            </div>

            {/* Comments List */}
            <div className="space-y-3 mb-3 max-h-52 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    Chưa có bình luận nào. Hãy bắt đầu cuộc trao đổi kỹ thuật với nhóm!
                  </p>
                </div>
              ) : (
                comments.map((cmt) => {
                  const isMe = currentUser?.id === cmt.user_id;
                  const initial = (cmt.user_name || 'U').charAt(0).toUpperCase();

                  return (
                    <div
                      key={cmt.id}
                      className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:bg-slate-50"
                    >
                      {/* Avatar */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[#D4FF00] font-black text-xs shadow-2xs">
                        {initial}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {cmt.user_name}
                          </span>
                          {isMe && (
                            <span className="rounded bg-slate-200 px-1 py-0.2 text-[9px] font-bold text-slate-700">
                              Bạn
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono ml-auto">
                            {formatRelativeTime(cmt.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {cmt.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Input */}
            <form onSubmit={handleSendComment} className="flex gap-2 items-start">
              <div className="flex-1 relative">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  rows={2}
                  placeholder="Viết bình luận, trao đổi kỹ thuật (Enter để gửi)..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-900 focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!commentInput.trim() || sendingComment}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3.5 py-2.5 text-xs font-bold hover:bg-slate-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {sendingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Gửi</span>
                    <Send className="h-3 w-3 text-[#D4FF00]" />
                  </>
                )}
              </button>
            </form>
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
