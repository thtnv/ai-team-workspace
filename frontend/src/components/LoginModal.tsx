'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  X,
  Lock,
  Mail,
  User,
  Loader2,
  LogIn,
  UserPlus,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    setCurrentUser,
    setWorkspaces,
    setCurrentWorkspace,
    setBoards,
    setCurrentBoard,
    setTasks,
    setNotes,
    setOnboardingOpen,
    setWalkthroughOpen,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Interactive Social OAuth Dialog States
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('thtnv9876@gmail.com');
  const [googleNameInput, setGoogleNameInput] = useState('Nguyễn Văn Viên');

  const [showGithubDialog, setShowGithubDialog] = useState(false);
  const [githubUsernameInput, setGithubUsernameInput] = useState('thtnv');

  const [showSsoDialog, setShowSsoDialog] = useState(false);
  const [ssoDomainInput, setSsoDomainInput] = useState('company.com');

  if (!isLoginModalOpen) return null;

  const refreshWorkspaceData = async (user: any) => {
    try {
      const workspaces = await api.getWorkspaces();
      setWorkspaces(workspaces);

      if (workspaces.length === 0) {
        // User has no workspace -> Open onboarding wizard
        setCurrentWorkspace(null);
        setCurrentBoard(null);
        setTasks([]);
        setOnboardingOpen(true);
        return;
      }

      const ws = workspaces[0];
      setCurrentWorkspace(ws);
      if (ws) {
        const boards = await api.getWorkspaceBoards(ws.id);
        setBoards(boards);
        const board = boards[0];
        setCurrentBoard(board);
        if (board) {
          const boardTasks = await api.getBoardTasks(board.id);
          setTasks(boardTasks);
          socketService.joinBoard(board.id, {
            id: user.id,
            name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
          });
        }
        const notes = await api.getNotes(ws.id);
        setNotes(notes);
      }
    } catch (e) {
      console.warn('Could not refresh workspace data after login:', e);
    }
  };

  const completeAuth = async (data: { access_token: string; user: any }) => {
    setCurrentUser(data.user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('syncpulse_last_provider', data.user.auth_provider || 'email');
    }
    await refreshWorkspaceData(data.user);
    setLoginModalOpen(false);
    setShowGoogleDialog(false);
    setShowGithubDialog(false);
    setShowSsoDialog(false);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  // 1. Submit email/password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        data = await api.login(email.trim().toLowerCase(), password);
      } else {
        data = await api.register(email.trim().toLowerCase(), fullName.trim(), password);
      }
      await completeAuth(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Google OAuth Flow
  const handleGoogleAuth = async (customEmail?: string, customName?: string) => {
    const finalEmail = (customEmail || googleEmailInput).trim().toLowerCase();
    const finalName = (customName || googleNameInput).trim() || finalEmail.split('@')[0];
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${finalEmail}`;

    setSocialLoading('google');
    setErrorMessage('');
    try {
      const data = await api.socialLogin({
        provider: 'google',
        email: finalEmail,
        full_name: finalName,
        avatar_url: avatar,
      });
      await completeAuth(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập Google thất bại');
    } finally {
      setSocialLoading(null);
    }
  };

  // 3. GitHub OAuth Flow
  const handleGithubAuth = async () => {
    const username = githubUsernameInput.trim();
    if (!username) return;
    const finalEmail = `${username.toLowerCase()}@github.users.syncpulse.ai`;
    const finalName = username;
    const avatar = `https://github.com/${username}.png`;

    setSocialLoading('github');
    setErrorMessage('');
    try {
      const data = await api.socialLogin({
        provider: 'github',
        email: finalEmail,
        full_name: finalName,
        avatar_url: avatar,
      });
      await completeAuth(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập GitHub thất bại');
    } finally {
      setSocialLoading(null);
    }
  };

  // 4. SAML SSO Flow
  const handleSsoAuth = async () => {
    const domain = ssoDomainInput.trim().toLowerCase();
    if (!domain) return;
    const finalEmail = `engineer@${domain}`;
    const finalName = `Enterprise Member (${domain})`;
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${domain}`;

    setSocialLoading('sso');
    setErrorMessage('');
    try {
      const data = await api.socialLogin({
        provider: 'sso',
        email: finalEmail,
        full_name: finalName,
        avatar_url: avatar,
      });
      await completeAuth(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập SSO thất bại');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-[390px] max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={() => setLoginModalOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          title="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center pt-0 pb-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4FF00] text-slate-950 font-black text-base mb-1.5 shadow-2xs border border-black/10">
            ⚡
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            {mode === 'login' ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Quản lý Sprint &amp; Cộng tác nhóm với AI Gemini
          </p>
        </div>

        {/* Social Login Buttons (Plane & Linear Style) */}
        <div className="space-y-2 mt-1">
          {/* Google Button */}
          <button
            type="button"
            onClick={() => setShowGoogleDialog(true)}
            disabled={Boolean(socialLoading)}
            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 py-2 px-3 text-xs font-bold text-slate-800 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              {/* Official Google Multi-color Logo */}
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Tiếp tục với Google</span>
            </div>

            <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[8px] font-bold text-emerald-700">
              Khuyên dùng
            </span>
          </button>

          {/* GitHub Button */}
          <button
            type="button"
            onClick={() => setShowGithubDialog(true)}
            disabled={Boolean(socialLoading)}
            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 py-2 px-3 text-xs font-bold text-slate-800 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              {/* GitHub Octocat Icon */}
              <svg className="h-3.5 w-3.5 shrink-0 fill-slate-900" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Tiếp tục với GitHub</span>
            </div>

            <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[8px] font-bold text-slate-700">
              Dev
            </span>
          </button>

          {/* Single Sign-On Button */}
          <button
            type="button"
            onClick={() => setShowSsoDialog(true)}
            disabled={Boolean(socialLoading)}
            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 py-2 px-3 text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Single Sign-On (SSO)</span>
            </div>

            <span className="text-[9px] text-slate-400 font-mono">
              SAML
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-2.5 flex items-center">
          <div className="flex-grow border-t border-slate-200" />
          <span className="mx-2.5 flex-shrink text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            hoặc email
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
            <span className="text-[11px]">{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          {mode === 'register' && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">
                Họ và tên *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Viên"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">
              Địa chỉ Email *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">
              Mật khẩu *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1.5 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer shadow-xs"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{mode === 'login' ? 'Đăng nhập với Email' : 'Tạo tài khoản'}</span>
            <ArrowRight className="h-3 w-3 text-[#D4FF00]" />
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-center text-xs text-slate-500">
          <div className="text-[11px]">
            {mode === 'login' ? (
              <span>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                  }}
                  className="font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  Đăng ký
                </button>
              </span>
            ) : (
              <span>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  Đăng nhập
                </button>
              </span>
            )}
          </div>

          <p className="text-[9px] text-slate-400 leading-tight">
            Bằng việc tiếp tục, bạn đồng ý với{' '}
            <span className="underline cursor-pointer hover:text-slate-600">Điều khoản dịch vụ</span> và{' '}
            <span className="underline cursor-pointer hover:text-slate-600">Chính sách bảo mật</span>.
          </p>
        </div>

        {/* Sub-modal: Google Account Selector (Linear & Plane Simulation) */}
        {showGoogleDialog && (
          <div className="absolute inset-0 z-20 flex flex-col bg-white p-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="text-xs font-bold text-slate-900">Đăng nhập tài khoản Google</h3>
              </div>
              <button
                onClick={() => setShowGoogleDialog(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 flex-1 overflow-y-auto">
              {/* Quick Pick Card 1 (thtnv9876@gmail.com) */}
              <div
                onClick={() => handleGoogleAuth('thtnv9876@gmail.com', 'Nguyễn Văn Viên')}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[#D4FF00] font-black text-xs">
                  V
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">Nguyễn Văn Viên</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">thtnv9876@gmail.com</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* Custom Google Account input */}
              <div className="pt-1">
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Hoặc đăng nhập bằng tài khoản Google khác:
                </label>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="your-google-account@gmail.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden mb-1.5"
                />
                <input
                  type="text"
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                  placeholder="Họ và tên hiển thị"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGoogleDialog(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(socialLoading)}
                onClick={() => handleGoogleAuth()}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                {socialLoading === 'google' && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Đăng nhập</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-modal: GitHub Account Selector */}
        {showGithubDialog && (
          <div className="absolute inset-0 z-20 flex flex-col bg-white p-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 fill-slate-900 shrink-0" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <h3 className="text-xs font-bold text-slate-900">Đăng nhập tài khoản GitHub</h3>
              </div>
              <button
                onClick={() => setShowGithubDialog(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 flex-1 overflow-y-auto">
              <p className="text-[11px] text-slate-600">
                Nhập tên tài khoản (Username) GitHub để tự động lấy avatar và thông tin:
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  GitHub Username:
                </label>
                <input
                  type="text"
                  value={githubUsernameInput}
                  onChange={(e) => setGithubUsernameInput(e.target.value)}
                  placeholder="VD: thtnv hoặc torvalds"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              {githubUsernameInput && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <img
                    src={`https://github.com/${githubUsernameInput}.png`}
                    alt="avatar"
                    className="h-8 w-8 rounded-full border border-slate-300 bg-slate-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 font-mono">@{githubUsernameInput}</div>
                    <div className="text-[10px] text-slate-500">Avatar tự động lấy từ GitHub</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGithubDialog(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(socialLoading) || !githubUsernameInput.trim()}
                onClick={() => handleGithubAuth()}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                {socialLoading === 'github' && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Xác nhận</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-modal: Single Sign-On (SSO) */}
        {showSsoDialog && (
          <div className="absolute inset-0 z-20 flex flex-col bg-white p-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900">Single Sign-On (SSO)</h3>
              </div>
              <button
                onClick={() => setShowSsoDialog(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-3 space-y-2.5 flex-1 overflow-y-auto">
              <p className="text-[11px] text-slate-600">
                Nhập tên miền công ty (Company Domain) để xác thực qua hệ thống định danh:
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">
                  Company Domain:
                </label>
                <input
                  type="text"
                  value={ssoDomainInput}
                  onChange={(e) => setSsoDomainInput(e.target.value)}
                  placeholder="VD: linear.app hoặc company.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Hỗ trợ Okta, Microsoft Azure AD, Google Workspace SAML.</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSsoDialog(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(socialLoading) || !ssoDomainInput.trim()}
                onClick={() => handleSsoAuth()}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                {socialLoading === 'sso' && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Tiếp tục</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
