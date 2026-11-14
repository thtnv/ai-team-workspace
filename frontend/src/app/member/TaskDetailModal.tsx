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
  Paperclip,
  ExternalLink,
  History,
  CheckCircle2,
  Award,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Task,
  Priority,
  Subtask,
  TaskComment,
  PRIORITY_CONFIG,
  WorkspaceMember,
  AttachmentItem,
  ActivityItem,
} from '@/types';

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

  // Agile & Supercharged Task State
  const [storyPoints, setStoryPoints] = useState<number | undefined>(undefined);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isAddingAttach, setIsAddingAttach] = useState(false);
  const [newAttachName, setNewAttachName] = useState('');
  const [newAttachUrl, setNewAttachUrl] = useState('');
  const [aiGeneratingChecklist, setAiGeneratingChecklist] = useState(false);
  const [aiGeneratingCriteria, setAiGeneratingCriteria] = useState(false);

  const comments = selectedTaskForDetail?.comments || [];
  const activityLogs = selectedTaskForDetail?.activity_log || [];

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
      setStoryPoints(selectedTaskForDetail.story_points ?? undefined);
      setAttachments(selectedTaskForDetail.attachments || []);
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
    const nextTags = [...tags, tagInput.trim()];
    setTags(nextTags);
    setTagInput('');
    handleSave({ tags: nextTags });
  };

  const handleRemoveTag = (t: string) => {
    const nextTags = tags.filter((x) => x !== t);
    setTags(nextTags);
    handleSave({ tags: nextTags });
  };

  const handleSelectStoryPoints = async (pts?: number) => {
    const nextPts = storyPoints === pts ? undefined : pts;
    setStoryPoints(nextPts);
    await handleSave({ story_points: nextPts });
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachName.trim() || !newAttachUrl.trim()) return;

    const isImg = /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(newAttachUrl.trim());
    const item: AttachmentItem = {
      id: `att-${Date.now()}`,
      name: newAttachName.trim(),
      url: newAttachUrl.trim(),
      file_type: isImg ? 'image' : 'link',
      uploaded_by: currentUser?.full_name || 'Member',
      created_at: new Date().toISOString(),
    };

    const nextAttachments = [...attachments, item];
    setAttachments(nextAttachments);
    setNewAttachName('');
    setNewAttachUrl('');
    setIsAddingAttach(false);
    await handleSave({ attachments: nextAttachments });
  };

  const handleDeleteAttachment = async (attachId: string) => {
    const nextAttachments = attachments.filter((a) => a.id !== attachId);
    setAttachments(nextAttachments);
    await handleSave({ attachments: nextAttachments });
  };

  const handleGenerateAIChecklist = async () => {
    if (!selectedTaskForDetail || aiGeneratingChecklist) return;
    setAiGeneratingChecklist(true);
    try {
      const res = await api.generateTaskAssistant(title, description);
      if (res.suggested_checklists && res.suggested_checklists.length > 0) {
        const newItems: Subtask[] = res.suggested_checklists.map((it: string, idx: number) => ({
          id: `ai-chk-${Date.now()}-${idx}`,
          title: it,
          is_done: false,
        }));
        const updated = [...checklists, ...newItems];
        setChecklists(updated);
        await handleSave({ checklists: updated });
      }
    } catch (err: any) {
      alert(err.message || 'Không thể sinh checklist AI.');
    } finally {
      setAiGeneratingChecklist(false);
    }
  };

  const handleGenerateAICriteria = async () => {
    if (!selectedTaskForDetail || aiGeneratingCriteria) return;
    setAiGeneratingCriteria(true);
    try {
      const res = await api.generateTaskAssistant(title, description);
      if (res.acceptance_criteria && res.acceptance_criteria.length > 0) {
        const criteriaText =
          '\n\n### Tiêu chí nghiệm thu (Acceptance Criteria):\n' +
          res.acceptance_criteria.map((it: string) => `- [ ] ${it}`).join('\n');
        const updatedDesc = (description || '') + criteriaText;
        setDescription(updatedDesc);
        await handleSave({ description: updatedDesc });
      }
    } catch (err: any) {
      alert(err.message || 'Không thể sinh tiêu chí nghiệm thu AI.');
    } finally {
      setAiGeneratingCriteria(false);
    }
  };

  const handleMoveColumn = async (destColId: string) => {
    if (!selectedTaskForDetail || !currentBoard) return;
    try {
      const updated = await api.moveTask({
        task_id: selectedTaskForDetail.id,
        board_id: currentBoard.id,
        source_col_id: selectedTaskForDetail.column_id,
        dest_col_id: destColId,
        new_order: selectedTaskForDetail.order,
      });
      updateTask(updated);
      setSelectedTaskForDetail(updated);
      if (destColId === 'col-done') {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D4FF00', '#22c55e', '#38bdf8', '#f59e0b'],
          });
        } catch {}
      }
    } catch (err: any) {
      alert(err.message || 'Không thể chuyển trạng thái công việc.');
    }
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
        story_points: storyPoints,
        attachments,
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

          {/* Priority, Tags & Story Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Độ ưu tiên:
              </label>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-1.5">
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
                      className={`rounded-lg border px-2 py-1 text-xs text-center transition cursor-pointer ${
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Award className="h-3 w-3 text-amber-500" />
                <span>Story Points:</span>
              </label>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 5, 8].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => handleSelectStoryPoints(pts)}
                    className={`h-7 w-7 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                      storyPoints === pts
                        ? 'bg-slate-950 text-[#D4FF00] border-slate-950 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pts}
                  </button>
                ))}
                {storyPoints !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleSelectStoryPoints(undefined)}
                    className="text-[10px] text-slate-400 hover:text-rose-600 underline ml-1 cursor-pointer"
                  >
                    Xóa
                  </button>
                )}
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

          {/* Description & AI Acceptance Criteria */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mô tả chi tiết &amp; Tiêu chí nghiệm thu:
              </label>
              <button
                type="button"
                onClick={handleGenerateAICriteria}
                disabled={aiGeneratingCriteria}
                className="inline-flex items-center gap-1 rounded-md bg-[#D4FF00]/40 border border-[#bce000] px-2 py-0.5 text-[10px] font-bold text-slate-900 hover:bg-[#D4FF00] transition cursor-pointer shadow-2xs disabled:opacity-50"
                title="Gemini AI tự động viết Tiêu chí nghiệm thu (Acceptance Criteria)"
              >
                {aiGeneratingCriteria ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-slate-900" />
                )}
                <span>AI viết Tiêu chí</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleSave()}
              placeholder="Ghi chú chi tiết công việc..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          {/* Checklists & AI Checklist Generator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>Danh sách Checklist ({checklists.filter((c) => c.is_done).length}/{checklists.length})</span>
              </label>

              <button
                type="button"
                onClick={handleGenerateAIChecklist}
                disabled={aiGeneratingChecklist}
                className="inline-flex items-center gap-1 rounded-md bg-[#D4FF00]/40 border border-[#bce000] px-2 py-0.5 text-[10px] font-bold text-slate-900 hover:bg-[#D4FF00] transition cursor-pointer shadow-2xs disabled:opacity-50"
                title="Gemini AI tự động phân tích và sinh danh sách checklist các bước triển khai"
              >
                {aiGeneratingChecklist ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-slate-900" />
                )}
                <span>AI sinh Checklist</span>
              </button>
            </div>

            {/* Smart Automation Alert: Triggered when all checklists are checked */}
            {checklists.length > 0 &&
              checklists.every((c) => c.is_done) &&
              selectedTaskForDetail.column_id !== 'col-done' && (
                <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        Tất cả {checklists.length} mục checklist đã hoàn thành!
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Bạn có muốn tự động chuyển công việc này sang giai đoạn tiếp theo không?
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedTaskForDetail.column_id !== 'col-review' && (
                      <button
                        type="button"
                        onClick={() => handleMoveColumn('col-review')}
                        className="rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-xs font-bold text-white transition shadow-2xs cursor-pointer"
                      >
                        In Review
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMoveColumn('col-done')}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white transition shadow-2xs cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

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
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
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
                className="flex items-center gap-1 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-slate-700" />
                <span>Tài liệu đính kèm ({attachments.length})</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingAttach(!isAddingAttach)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Thêm đính kèm</span>
              </button>
            </div>

            {isAddingAttach && (
              <form onSubmit={handleAddAttachment} className="mb-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2 animate-in fade-in duration-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newAttachName}
                    onChange={(e) => setNewAttachName(e.target.value)}
                    placeholder="Tên tệp (VD: Figma Design, API Spec...)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                  <input
                    type="url"
                    value={newAttachUrl}
                    onChange={(e) => setNewAttachUrl(e.target.value)}
                    placeholder="URL liên kết / Ảnh (https://...)"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAttach(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!newAttachName.trim() || !newAttachUrl.trim()}
                    className="px-3 py-1 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    Lưu đính kèm
                  </button>
                </div>
              </form>
            )}

            {/* Attachments List */}
            {attachments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-3 text-center">
                <p className="text-xs text-slate-400">Chưa có tài liệu hoặc đường dẫn đính kèm nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.file_type === 'image' ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="h-8 w-8 rounded object-cover shrink-0 border border-slate-100"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
                          <LinkIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate block hover:underline"
                        >
                          {att.name}
                        </a>
                        <span className="text-[10px] text-slate-400 font-mono truncate block">
                          {formatRelativeTime(att.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Mở liên kết ngoài"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Xóa đính kèm"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

          {/* Activity Log (Audit Trail) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-slate-700" />
                <span>Nhật ký hoạt động ({activityLogs.length})</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Lịch sử kiểm toán thời gian thực</span>
            </div>

            {activityLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-3 text-center">
                <p className="text-xs text-slate-400">Chưa ghi nhận hoạt động nào.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {activityLogs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 text-xs text-slate-600 py-1 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900">{log.user_name} </span>
                        <span>{log.detail || log.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
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
