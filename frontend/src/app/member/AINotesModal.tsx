'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Mic,
  MicOff,
  Bold,
  Heading,
  List,
  CheckSquare,
  Wand2,
  Rocket,
  Target,
  Users as UsersIcon,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { Note, ActionItem, NoteSummary } from '@/types';

const MEETING_TEMPLATES = [
  {
    id: 'standup',
    name: 'Daily Standup',
    icon: Rocket,
    content: `## Daily Standup - Cập nhật tiến độ
### 1. Việc đã hoàn thành hôm qua:
- 

### 2. Kế hoạch công việc hôm nay:
- 

### 3. Vướng mắc / Trở ngại (Blockers):
- Không có`,
  },
  {
    id: 'sprint_planning',
    name: 'Sprint Planning',
    icon: Target,
    content: `## Kế hoạch Sprint mới
### Mục tiêu Sprint (Sprint Goal):
- 

### Danh sách tính năng cam kết:
- [ ] Tính năng A
- [ ] Tính năng B

### Quyết định kỹ thuật & Phân công:
- Kiến trúc giải pháp: 
- Phụ trách chính: `,
  },
  {
    id: 'one_on_one',
    name: 'Họp 1-on-1',
    icon: UsersIcon,
    content: `## Biên bản Họp 1-on-1
### Điểm sáng & Tiến độ tuần qua:
- 

### Khó khăn & Hỗ trợ cần thiết:
- 

### Kế hoạch phát triển & Mục tiêu sắp tới:
- `,
  },
  {
    id: 'brainstorm',
    name: 'Brainstorming & RFC',
    icon: Lightbulb,
    content: `## Thảo luận Giải pháp Kỹ thuật (RFC)
### Vấn đề cần giải quyết:
- 

### Các phương án đề xuất:
- Phương án 1: 
- Phương án 2: 

### Quyết định chốt:
- Thống nhất chọn phương án: `,
  },
];

const REAL_SAMPLE_NOTE = `Mục tiêu cuộc họp:
- Hoàn thiện luồng xác thực Google & GitHub OAuth và tối ưu hóa hiệu năng bảng Kanban cho SyncPulse AI.

Nội dung trao đổi:
- Đã khắc phục lỗi ảnh đại diện Google 403 bằng cách thêm referrerPolicy="no-referrer" trên toàn bộ thẻ ảnh frontend.
- Cơ chế liên kết tài khoản (Account Linking): Người dùng đăng nhập bằng cả Google và GitHub có cùng một địa chỉ Gmail sẽ tự động đăng nhập vào cùng một tài khoản duy nhất, không bị nhân bản dữ liệu.
- Thay thế toàn bộ emoji bằng icon vector Lucide SVG chuẩn GitHub Enterprise.
- Tối ưu hóa hiệu năng: Bọc React.memo cho TaskCard, KanbanColumn và bổ sung compound index trong MongoDB để loại bỏ hoàn toàn độ trễ lag khi thao tác.

Phân công công việc:
- Nguyễn Văn Viên: Kiểm thử đăng nhập Google và GitHub trên môi trường local, xác nhận avatar hiển thị sắc nét (Hạn chót: 18:00 hôm nay, Ưu tiên: Cao).
- Backend team: Tạo compound index cho MongoDB và kiểm tra thời gian phản hồi API dưới 5ms (Hạn chót: Ngày mai, Ưu tiên: Cao).
- Frontend team: Kiểm tra độ mượt kéo thả 60fps sau khi bọc React.memo (Hạn chót: Thứ Sáu, Ưu tiên: Vừa).`;

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const wordCount = rawContent.trim() ? rawContent.trim().split(/\s+/).length : 0;

  const toggleVoiceDictation = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          setRawContent((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed}\n- ${transcript.trim()}` : `- ${transcript.trim()}`;
          });
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Could not start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;
      const currentLine = value.substring(0, selectionStart).split('\n').pop() || '';

      // Check checklist "- [ ] "
      if (currentLine.startsWith('- [ ] ')) {
        e.preventDefault();
        if (currentLine.trim() === '- [ ]') {
          const beforeLine = value.substring(0, selectionStart - currentLine.length);
          const afterCursor = value.substring(selectionEnd);
          const newValue = beforeLine + afterCursor;
          setRawContent(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = beforeLine.length;
          }, 0);
        } else {
          const insertText = '\n- [ ] ';
          const newValue = value.substring(0, selectionStart) + insertText + value.substring(selectionEnd);
          setRawContent(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
          }, 0);
        }
        return;
      }

      // Check bullet list "- " or "* "
      if (currentLine.startsWith('- ') || currentLine.startsWith('* ')) {
        e.preventDefault();
        const prefix = currentLine.startsWith('- ') ? '- ' : '* ';
        if (currentLine.trim() === prefix.trim()) {
          const beforeLine = value.substring(0, selectionStart - currentLine.length);
          const afterCursor = value.substring(selectionEnd);
          const newValue = beforeLine + afterCursor;
          setRawContent(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = beforeLine.length;
          }, 0);
        } else {
          const insertText = `\n${prefix}`;
          const newValue = value.substring(0, selectionStart) + insertText + value.substring(selectionEnd);
          setRawContent(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
          }, 0);
        }
        return;
      }

      // Check numbered list "1. "
      const numMatch = currentLine.match(/^(\d+)\.\s+/);
      if (numMatch) {
        e.preventDefault();
        const currentNum = parseInt(numMatch[1], 10);
        if (currentLine.trim() === `${currentNum}.`) {
          const beforeLine = value.substring(0, selectionStart - currentLine.length);
          const afterCursor = value.substring(selectionEnd);
          const newValue = beforeLine + afterCursor;
          setRawContent(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = beforeLine.length;
          }, 0);
        } else {
          const insertText = `\n${currentNum + 1}. `;
          const newValue = value.substring(0, selectionStart) + insertText + value.substring(selectionEnd);
          setRawContent(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
          }, 0);
        }
        return;
      }
    }
  };

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = rawContent.substring(start, end);
    const placeholder = selected || 'văn bản';
    const replacement = `${before}${placeholder}${after}`;
    const newContent = rawContent.substring(0, start) + replacement + rawContent.substring(end);
    setRawContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
    }, 0);
  };

  const handleCleanTranscript = () => {
    if (!rawContent.trim()) return;
    const cleaned = rawContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => !/^\d{1,2}:\d{2}(:\d{2})?(\s*-->\s*\d{1,2}:\d{2}(:\d{2})?)?$/.test(line))
      .filter((line) => !/^\d+$/.test(line))
      .join('\n');
    setRawContent(cleaned);
  };

  const handleApplyTemplate = (templateContent: string) => {
    if (rawContent.trim() && rawContent.length > 20) {
      if (!confirm('Nội dung hiện tại sẽ được thay thế bằng mẫu mới. Bạn có chắc muốn tiếp tục?')) {
        return;
      }
    }
    setRawContent(templateContent);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

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
                    {n.summary ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                        <span>Đã phân tích</span>
                      </span>
                    ) : (
                      <span>Chưa phân tích</span>
                    )}
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

                {/* Quick Meeting Templates Bar */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Mẫu biên bản họp có sẵn (1-Click):
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Chọn mẫu để tự động điền cấu trúc</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(REAL_SAMPLE_NOTE)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition cursor-pointer shadow-2xs"
                      title="Điền ngay dữ liệu cuộc họp thật hoàn chỉnh vào khung để trải nghiệm phân tích AI tức thì"
                    >
                      <Sparkles className="h-3 w-3 text-indigo-600" />
                      <span>Điền dữ liệu họp thật mẫu</span>
                    </button>

                    {MEETING_TEMPLATES.map((tmpl) => {
                      const IconComp = tmpl.icon;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => handleApplyTemplate(tmpl.content)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                          title={`Áp dụng ${tmpl.name}`}
                        >
                          <IconComp className="h-3 w-3 text-slate-600" />
                          <span>{tmpl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Smart Raw Content Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Nội dung cuộc họp thô:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Hỗ trợ gõ <kbd className="rounded bg-slate-100 px-1 border border-slate-200 font-mono text-[10px]">Enter</kbd> tự nhảy dòng hoặc Bật Mic nói
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-300 bg-white shadow-2xs overflow-hidden focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 transition">
                    {/* Smart Editor Formatting Toolbar */}
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => insertFormatting('**', '**')}
                          className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition font-bold"
                          title="In đậm (Bold: **chữ**)"
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('### ', '')}
                          className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition font-bold"
                          title="Tiêu đề mục (Heading 3: ### )"
                        >
                          <Heading className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('- ', '')}
                          className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                          title="Gạch đầu dòng (List: - )"
                        >
                          <List className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('- [ ] ', '')}
                          className="rounded p-1 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition"
                          title="Hộp kiểm việc (Checklist: - [ ] )"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                        </button>

                        <div className="h-3.5 w-px bg-slate-300 mx-1" />

                        {/* Clean Meet / Zoom transcript helper */}
                        <button
                          type="button"
                          onClick={handleCleanTranscript}
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
                          title="Lọc bỏ timestamp rác từ Google Meet / Zoom / MS Teams"
                        >
                          <Wand2 className="h-3 w-3 text-indigo-500" />
                          <span>Lọc transcript Meet/Zoom</span>
                        </button>
                      </div>

                      {/* Right: Voice Dictation with Web Speech API */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleVoiceDictation}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer shadow-2xs ${
                            isListening
                              ? 'border-rose-400 bg-rose-50 text-rose-700 animate-pulse ring-2 ring-rose-300'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Bật mic để nói trực tiếp, giọng nói tiếng Việt tự chuyển thành văn bản"
                        >
                          {isListening ? (
                            <>
                              <Mic className="h-3 w-3 text-rose-600 animate-bounce" />
                              <span>Đang ghi âm... (Bấm dừng)</span>
                            </>
                          ) : (
                            <>
                              <Mic className="h-3 w-3 text-slate-600" />
                              <span>Bật Mic nói</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      rows={8}
                      value={rawContent}
                      onChange={(e) => setRawContent(e.target.value)}
                      onKeyDown={handleTextareaKeyDown}
                      placeholder="Gõ hoặc dán nội dung thảo luận cuộc họp vào đây, hoặc chọn Mẫu nhanh ở trên, hoặc bấm Bật Mic nói để chuyển giọng nói thành văn bản..."
                      className="w-full p-3.5 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none resize-y min-h-[160px] font-sans bg-transparent"
                    />

                    {/* Footer word count & AI readiness */}
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-1.5 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        {wordCount === 0 ? (
                          <span className="text-slate-400">Chưa có nội dung</span>
                        ) : wordCount < 15 ? (
                          <span className="text-amber-600 font-medium">
                            Đã nhập {wordCount} từ • Gợi ý: Thêm tên người phụ trách hoặc quyết định để AI phân tích chuẩn hơn
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3 text-emerald-600" />
                            Đã nhập {wordCount} từ • Đầy đủ dữ liệu để AI trích xuất Quyết định & Action items
                          </span>
                        )}
                      </div>

                      {rawContent.trim() && (
                        <button
                          type="button"
                          onClick={() => setRawContent('')}
                          className="text-slate-400 hover:text-rose-600 transition text-[10px] cursor-pointer"
                        >
                          Xóa nội dung
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Summary View */}
                {selectedNote.summary && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-5">
                    {/* TL;DR Overview */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Tổng quan cuộc họp (TL;DR)</span>
                      </span>
                      <p className="mt-1 text-xs text-slate-800 leading-relaxed font-medium">
                        {selectedNote.summary.overview}
                      </p>
                    </div>

                    {/* Key Decisions */}
                    {selectedNote.summary.key_decisions?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Các quyết định cốt lõi đã chốt:</span>
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
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />
                            <span>Đầu việc cần làm (Action Items):</span>
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
