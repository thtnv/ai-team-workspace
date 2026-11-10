'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import {
  X,
  UserPlus,
  Copy,
  Check,
  Mail,
  Shield,
  ShieldCheck,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  ShieldAlert,
} from 'lucide-react';

export const InviteModal: React.FC = () => {
  const {
    currentWorkspace,
    setCurrentWorkspace,
    isInviteModalOpen,
    setInviteModalOpen,
    currentUser,
  } = useStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isInviteModalOpen || !currentWorkspace) return null;

  const isOwner = Boolean(currentUser && currentWorkspace && currentUser.id === currentWorkspace.owner_id);
  const userMember = currentWorkspace.members?.find((m) => m.user_id === currentUser?.id);
  const isAdmin = Boolean(isOwner || userMember?.role === 'admin');

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="relative flex flex-col items-center text-center max-w-sm w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 mb-3 text-amber-600 shadow-2xs">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Giới hạn quyền mời</h3>
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            Bạn đang đăng nhập với vai trò <span className="font-bold text-slate-900">{userMember?.role === 'viewer' ? 'Quan sát viên' : 'Thành viên'}</span>. Chỉ Quản trị viên (Admin) hoặc Trưởng nhóm mới có quyền mời hoặc chia sẻ mã mời tham gia Không gian làm việc.
          </p>
          <button
            onClick={() => setInviteModalOpen(false)}
            className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition shadow-2xs cursor-pointer"
          >
            Đã hiểu, quay lại
          </button>
        </div>
      </div>
    );
  }

  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}?invite=${currentWorkspace.id}`
      : `http://localhost:3000?invite=${currentWorkspace.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentWorkspace.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.inviteMember(currentWorkspace.id, cleanEmail, role);
      setFeedback({ type: 'success', message: res.message });
      setEmail('');

      // Update workspace members in local store
      if (res.members) {
        setCurrentWorkspace({
          ...currentWorkspace,
          members: res.members,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Không thể mời thành viên. Vui lòng thử lại.',
      });
    } finally {
      setLoading(false);
    }
  };

  const members = currentWorkspace.members || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4FF00] shadow-2xs">
              <UserPlus className="h-4.5 w-4.5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Mời thành viên vào nhóm</h2>
              <p className="text-[11px] text-slate-500">
                Không gian: <span className="font-semibold text-slate-800">{currentWorkspace.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setInviteModalOpen(false);
              setFeedback(null);
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Direct Share Link & Code */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Đường link mời trực tiếp (Click để sao chép)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-600 select-all font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Đã copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2">
              <div className="text-xs">
                <span className="text-slate-500">Mã mời (Workspace Code): </span>
                <span className="font-mono font-bold text-slate-900 ml-1">{currentWorkspace.id}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-xs font-semibold text-slate-600 hover:text-slate-950 inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedCode ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedCode ? 'Đã copy' : 'Copy mã'}
              </button>
            </div>
          </div>

          {/* Invite by Email */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-500" />
              Mời nhanh qua Email
            </h3>
            <form onSubmit={handleInviteEmail} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="email-dong-nghiep@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-slate-900 focus:outline-hidden"
                >
                  <option value="member">Thành viên</option>
                  <option value="admin">Đồng quản lý</option>
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 text-[#D4FF00]" />}
                  Thêm
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Nếu người này đã có tài khoản, họ sẽ được thêm ngay lập tức. Nếu chưa, họ sẽ tự động vào nhóm khi đăng ký với email này.
              </p>
            </form>
          </div>

          {/* Members List */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                Thành viên trong nhóm ({members.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
              {members.map((m: any, idx: number) => {
                const isLeader = m.role === 'admin' || m.user_id === currentWorkspace.owner_id;
                return (
                  <div key={m.user_id || idx} className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200 shrink-0">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt={m.full_name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#D4FF00] text-[10px] font-bold text-slate-950">
                            {m.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{m.full_name}</span>
                          {m.user_id === currentUser?.id && (
                            <span className="text-[10px] font-medium text-slate-400">(Bạn)</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block">{m.email}</span>
                      </div>
                    </div>

                    <div>
                      {isLeader ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <ShieldCheck className="h-3 w-3 text-amber-600" />
                          Trưởng nhóm
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          <Shield className="h-3 w-3 text-slate-400" />
                          Thành viên
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
