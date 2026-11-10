'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import {
  X,
  Users,
  Settings,
  Sparkles,
  BarChart3,
  AlertTriangle,
  UserCheck,
  Shield,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Search,
  UserPlus,
  KeyRound,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';

export const WorkspaceSettingsModal: React.FC = () => {
  const {
    isWorkspaceSettingsOpen,
    setWorkspaceSettingsOpen,
    currentWorkspace,
    setCurrentWorkspace,
    updateWorkspaceInStore,
    currentUser,
    setInviteModalOpen,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'members' | 'general' | 'ai' | 'stats' | 'danger'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // General tab states
  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  // Stats tab states
  const [stats, setStats] = useState<{
    total_tasks: number;
    completed_tasks: number;
    total_boards: number;
    total_members: number;
    total_notes: number;
    ai_tasks_count: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Role updating state
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [resettingCode, setResettingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name);
      setWsDesc(currentWorkspace.description || '');
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (activeTab === 'stats' && currentWorkspace) {
      fetchStats();
    }
  }, [activeTab, currentWorkspace]);

  if (!isWorkspaceSettingsOpen || !currentWorkspace) return null;

  const isOwner = currentUser?.id === currentWorkspace.owner_id;
  const userMember = currentWorkspace.members.find((m) => m.user_id === currentUser?.id);
  const isAdmin = isOwner || userMember?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="relative flex flex-col items-center text-center max-w-sm w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 mb-3 text-amber-600 shadow-2xs">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Quyền truy cập bị giới hạn</h3>
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            Bạn đang đăng nhập với vai trò <span className="font-bold text-slate-900">{userMember?.role === 'viewer' ? 'Quan sát viên' : 'Thành viên'}</span>. Chỉ Quản trị viên (Admin) hoặc Trưởng nhóm mới có quyền thay đổi Cài đặt và Phân quyền không gian này.
          </p>
          <button
            onClick={() => setWorkspaceSettingsOpen(false)}
            className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition shadow-2xs cursor-pointer"
          >
            Đã hiểu, quay lại
          </button>
        </div>
      </div>
    );
  }

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.getWorkspaceStats(currentWorkspace.id);
      setStats(data);
    } catch (err) {
      console.warn('Could not load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setSavingGeneral(true);
    setErrorMessage('');
    try {
      const updated = await api.updateWorkspace(currentWorkspace.id, {
        name: wsName.trim(),
        description: wsDesc.trim(),
      });
      updateWorkspaceInStore(updated);
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể lưu cài đặt không gian.');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member' | 'viewer') => {
    setUpdatingRoleUserId(userId);
    setErrorMessage('');
    try {
      const updated = await api.updateMemberRole(currentWorkspace.id, userId, newRole);
      updateWorkspaceInStore(updated);
      setActionSuccessMessage('Đã cập nhật vai trò thành công!');
      setTimeout(() => setActionSuccessMessage(''), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể thay đổi vai trò.');
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thành viên "${memberName}" khỏi không gian này không?`)) {
      return;
    }
    setRemovingUserId(userId);
    setErrorMessage('');
    try {
      const updated = await api.removeMember(currentWorkspace.id, userId);
      updateWorkspaceInStore(updated);
      setActionSuccessMessage(`Đã xóa ${memberName} khỏi nhóm.`);
      setTimeout(() => setActionSuccessMessage(''), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể xóa thành viên.');
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleResetInviteCode = async () => {
    if (!window.confirm('Tạo mã mời mới sẽ vô hiệu hóa tất cả các link/mã mời cũ trước đây. Bạn có chắc không?')) {
      return;
    }
    setResettingCode(true);
    setErrorMessage('');
    try {
      const res = await api.resetInviteCode(currentWorkspace.id);
      const updated = { ...currentWorkspace, slug: res.new_invite_code };
      updateWorkspaceInStore(updated);
      setActionSuccessMessage('Đã tạo mới mã mời thành công!');
      setTimeout(() => setActionSuccessMessage(''), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo lại mã mời.');
    } finally {
      setResettingCode(false);
    }
  };

  const copyInviteLink = () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}?join=${currentWorkspace.slug || currentWorkspace.id}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyInviteCode = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(currentWorkspace.slug || currentWorkspace.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const filteredMembers = currentWorkspace.members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-[#D4FF00] font-black text-sm shadow-xs">
              <Zap className="h-4 w-4 text-[#D4FF00] fill-[#D4FF00]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Cài đặt Không gian làm việc</h2>
                <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                  {currentWorkspace.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Quản lý thành viên, quyền hạn và cấu hình AI hệ thống</p>
            </div>
          </div>

          <button
            onClick={() => setWorkspaceSettingsOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action feedback banners */}
        {errorMessage && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-800">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {actionSuccessMessage && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Main Body: Left Sidebar + Right Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar (Linear / Plane Style) */}
          <div className="w-56 shrink-0 border-r border-slate-200 bg-slate-50/60 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Thành viên &amp; Phân quyền</span>
              <span
                className={`ml-auto rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                  activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {currentWorkspace.members.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Thông tin Không gian</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="h-4 w-4 text-[#D4FF00]" />
              <span>AI &amp; Tích hợp</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Thống kê Sprint</span>
            </button>

            <div className="pt-3 border-t border-slate-200 mt-3" />

            <button
              onClick={() => setActiveTab('danger')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'danger'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Vùng Nguy hiểm</span>
            </button>
          </div>

          {/* Right Content View */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {/* TAB 1: MEMBERS & ROLES */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Danh sách Thành viên</h3>
                    <p className="text-xs text-slate-500">Phân quyền vai trò và quản lý ai có thể truy cập không gian này</p>
                  </div>

                  <button
                    onClick={() => {
                      setWorkspaceSettingsOpen(false);
                      setInviteModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-[#D4FF00]" />
                    <span>Mời thành viên</span>
                  </button>
                </div>

                {/* Search Bar & Stats */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Tìm thành viên theo tên hoặc email..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Tổng cộng: <strong className="text-slate-900">{filteredMembers.length}</strong>
                  </div>
                </div>

                {/* Members Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">Thành viên</th>
                        <th className="py-2.5 px-3">Vai trò</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMembers.map((member) => {
                        const isSelf = member.user_id === currentUser?.id;
                        const isMemberOwner = member.user_id === currentWorkspace.owner_id;
                        return (
                          <tr key={member.user_id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-slate-200 ring-1 ring-slate-300 overflow-hidden shrink-0">
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.full_name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center font-bold text-slate-700 text-xs">
                                      {member.full_name?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{member.full_name}</span>
                                    {isSelf && (
                                      <span className="rounded bg-slate-100 text-slate-600 px-1 py-0.2 text-[9px] font-semibold">
                                        Bạn
                                      </span>
                                    )}
                                    {isMemberOwner && (
                                      <span className="rounded bg-emerald-100 text-emerald-800 px-1 py-0.2 text-[9px] font-bold">
                                        Trưởng nhóm
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {isAdmin && !isMemberOwner ? (
                                <select
                                  value={member.role}
                                  disabled={updatingRoleUserId === member.user_id}
                                  onChange={(e) =>
                                    handleRoleChange(member.user_id, e.target.value as 'admin' | 'member' | 'viewer')
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-slate-900 focus:outline-hidden cursor-pointer"
                                >
                                  <option value="admin">Quản trị viên (Admin)</option>
                                  <option value="member">Thành viên (Member)</option>
                                  <option value="viewer">Quan sát viên (Viewer)</option>
                                </select>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                    member.role === 'admin'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : member.role === 'viewer'
                                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {member.role === 'admin'
                                    ? 'Quản trị viên'
                                    : member.role === 'viewer'
                                    ? 'Quan sát viên'
                                    : 'Thành viên'}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              {isAdmin && !isMemberOwner && (
                                <button
                                  type="button"
                                  disabled={removingUserId === member.user_id}
                                  onClick={() => handleRemoveMember(member.user_id, member.full_name)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Xóa thành viên khỏi nhóm"
                                >
                                  {removingUserId === member.user_id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  <span>Xóa</span>
                                </button>
                              )}
                              {isMemberOwner && (
                                <span className="text-[10px] text-slate-400 italic">Chủ sở hữu</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Invite Link Card */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Mã mời tham gia nhóm</div>
                    <div className="text-[11px] text-slate-500">
                      Gửi mã hoặc đường dẫn này cho đồng nghiệp để họ tham gia ngay lập tức.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyInviteCode}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                    >
                      {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{currentWorkspace.slug || currentWorkspace.id}</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyInviteLink}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
                    >
                      {copiedLink ? <Check className="h-3 w-3 text-[#D4FF00]" /> : <Copy className="h-3 w-3 text-[#D4FF00]" />}
                      <span>Copy Link Mời</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GENERAL SETTINGS */}
            {activeTab === 'general' && (
              <form onSubmit={handleSaveGeneral} className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Thông tin Không gian làm việc</h3>
                  <p className="text-xs text-slate-500">Cập nhật tên nhóm, mục tiêu sprint và thông tin nhận diện</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tên Không gian (Workspace Name) *</label>
                  <input
                    type="text"
                    required
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder="VD: HyperScale Engineering"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mã định danh (Identifier Slug)</label>
                  <input
                    type="text"
                    disabled
                    value={currentWorkspace.slug || currentWorkspace.id}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Dùng làm mã mời tham gia nhanh.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả mục tiêu của nhóm</label>
                  <textarea
                    rows={3}
                    value={wsDesc}
                    onChange={(e) => setWsDesc(e.target.value)}
                    placeholder="Mô tả dự án hoặc mục tiêu trọng tâm trong Sprint này..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>

                {generalSuccess && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Đã cập nhật thông tin không gian thành công!</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingGeneral || !wsName.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer shadow-xs"
                  >
                    {savingGeneral && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Lưu thay đổi</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: AI & INTEGRATIONS */}
            {activeTab === 'ai' && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Trí tuệ Nhân tạo &amp; Tích hợp OAuth</h3>
                  <p className="text-xs text-slate-500">Cấu hình mô hình Gemini AI và các cổng đăng nhập liên kết</p>
                </div>

                {/* Gemini Engine Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4FF00] text-slate-950 font-black text-xs">
                        <Sparkles className="h-4 w-4 text-slate-950" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Google Gemini AI Engine</div>
                        <div className="text-[11px] text-slate-500">Phân rã User Story thành checklist &amp; tóm tắt cuộc họp</div>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Đang hoạt động
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                    Model mặc định: <strong>gemini-3.5-flash</strong> (Tối ưu tốc độ cao &amp; tư duy kỹ thuật chuẩn xác)
                  </div>
                </div>

                {/* OAuth Status Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="text-xs font-bold text-slate-900">Trạng thái Cổng Đăng nhập OAuth 2.0</div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Google OAuth 2.0</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Sẵn sàng
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <svg className="h-3.5 w-3.5 fill-slate-900" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        <span>GitHub OAuth 2.0</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        Hỗ trợ đa nền tảng
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: STATS & ANALYTICS */}
            {activeTab === 'stats' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Thống kê Không gian &amp; Tiến độ Sprint</h3>
                    <p className="text-xs text-slate-500">Dữ liệu thời gian thực được tổng hợp từ cơ sở dữ liệu MongoDB</p>
                  </div>
                  <button
                    onClick={fetchStats}
                    disabled={loadingStats}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    title="Làm mới thống kê"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingStats && !stats ? (
                  <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                    <span>Đang tính toán thống kê...</span>
                  </div>
                ) : stats ? (
                  <div className="space-y-4">
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng công việc</div>
                        <div className="text-xl font-black text-slate-900 mt-1">{stats.total_tasks}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Trên tất cả các bảng</div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Đã hoàn thành</div>
                        <div className="text-xl font-black text-emerald-800 mt-1">{stats.completed_tasks}</div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">Cột Done</div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Thành viên</div>
                        <div className="text-xl font-black text-blue-800 mt-1">{stats.total_members}</div>
                        <div className="text-[10px] text-blue-600 mt-0.5">Đã tham gia nhóm</div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">AI Task Breakdown</div>
                        <div className="text-xl font-black text-amber-800 mt-1">{stats.ai_tasks_count}</div>
                        <div className="text-[10px] text-amber-600 mt-0.5">Phân rã bởi Gemini</div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ghi chú cuộc họp</div>
                        <div className="text-xl font-black text-slate-900 mt-1">{stats.total_notes}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Biên bản cuộc họp</div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số bảng Kanban</div>
                        <div className="text-xl font-black text-slate-900 mt-1">{stats.total_boards}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Sprint Boards</div>
                      </div>
                    </div>

                    {/* Completion rate progress */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1.5">
                        <span>Tỷ lệ hoàn thành Sprint</span>
                        <span>
                          {stats.total_tasks > 0
                            ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#D4FF00] rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              stats.total_tasks > 0
                                ? (stats.completed_tasks / stats.total_tasks) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* TAB 5: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Vùng Nguy hiểm (Danger Zone)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Các thao tác quan trọng có ảnh hưởng lớn tới không gian làm việc</p>
                </div>

                {/* Reset Invite Code */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                  <div className="text-xs font-bold text-amber-900">Tạo mới Mã mời (Reset Invite Code)</div>
                  <div className="text-[11px] text-amber-800 leading-relaxed">
                    Nếu bạn nghi ngờ mã mời hoặc liên kết mời bị rò rỉ ra ngoài, hãy tạo mã mời mới. Mã cũ sẽ lập tức bị vô hiệu hóa.
                  </div>
                  <button
                    type="button"
                    disabled={resettingCode || !isAdmin}
                    onClick={handleResetInviteCode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition cursor-pointer shadow-2xs"
                  >
                    {resettingCode && <Loader2 className="h-3 w-3 animate-spin" />}
                    <RefreshCw className="h-3 w-3" />
                    <span>Tạo lại mã mời mới</span>
                  </button>
                </div>

                {/* Workspace ID notice */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-xs text-slate-600">
                  <div className="font-bold text-slate-900">Mã định danh nội bộ:</div>
                  <div className="font-mono text-[11px] text-slate-500 select-all">{currentWorkspace.id}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Được tạo lúc: {new Date(currentWorkspace.created_at).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

