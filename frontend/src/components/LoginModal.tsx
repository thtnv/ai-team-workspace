'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import {
  X,
  Lock,
  Mail,
  User,
  Loader2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  Settings2,
  Zap,
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
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Real OAuth configuration from backend
  const [oauthConfig, setOAuthConfig] = useState<{
    google_client_id: string;
    github_client_id: string;
    google_enabled: boolean;
    github_enabled: boolean;
  } | null>(null);

  // Setup modal when credentials are not yet configured
  const [showConfigModal, setShowConfigModal] = useState<'google' | 'github' | null>(null);
  const [cfgClientId, setCfgClientId] = useState('');
  const [cfgClientSecret, setCfgClientSecret] = useState('');
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch live OAuth configuration on modal open
  useEffect(() => {
    if (!isLoginModalOpen) return;
    const fetchConfig = async () => {
      try {
        const cfg = await api.getOAuthConfig();
        setOAuthConfig(cfg);
      } catch (err) {
        console.warn('Could not load OAuth config:', err);
      }
    };
    fetchConfig();
  }, [isLoginModalOpen]);

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
    setShowConfigModal(null);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  // 1. Submit email/password (100% Real Database Auth)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
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
      setErrorMessage(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại email/mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Real Google OAuth
  const handleGoogleClick = async () => {
    setErrorMessage('');
    setInfoMessage('');
    let cfg = oauthConfig;
    if (!cfg) {
      try {
        cfg = await api.getOAuthConfig();
        setOAuthConfig(cfg);
      } catch (e) {
        // ignore
      }
    }

    if (cfg && cfg.google_enabled && cfg.google_client_id) {
      // Direct redirect to real Google OAuth
      setSocialLoading('google');
      const redirectUri = `${window.location.origin}/auth/callback`;
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        cfg.google_client_id
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=openid%20profile%20email&state=google&access_type=offline&prompt=consent`;
      window.location.href = googleOAuthUrl;
    } else {
      // Need configuration
      setCfgClientId('');
      setCfgClientSecret('');
      setShowConfigModal('google');
    }
  };

  // 3. Real GitHub OAuth
  const handleGithubClick = async () => {
    setErrorMessage('');
    setInfoMessage('');
    let cfg = oauthConfig;
    if (!cfg) {
      try {
        cfg = await api.getOAuthConfig();
        setOAuthConfig(cfg);
      } catch (e) {
        // ignore
      }
    }

    if (cfg && cfg.github_enabled && cfg.github_client_id) {
      // Direct redirect to real GitHub OAuth
      setSocialLoading('github');
      const redirectUri = `${window.location.origin}/auth/callback`;
      const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
        cfg.github_client_id
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email&state=github`;
      window.location.href = githubOAuthUrl;
    } else {
      // Need configuration
      setCfgClientId('');
      setCfgClientSecret('');
      setShowConfigModal('github');
    }
  };

  // 4. Save OAuth config and immediately redirect to provider
  const handleSaveConfigAndContinue = async () => {
    if (!cfgClientId.trim()) {
      setErrorMessage('Vui lòng nhập Client ID.');
      return;
    }

    setSavingConfig(true);
    setErrorMessage('');
    try {
      const payload =
        showConfigModal === 'google'
          ? { google_client_id: cfgClientId.trim(), google_client_secret: cfgClientSecret.trim() }
          : { github_client_id: cfgClientId.trim(), github_client_secret: cfgClientSecret.trim() };

      const updated = await api.saveOAuthConfig(payload);
      setOAuthConfig(updated);

      const redirectUri = `${window.location.origin}/auth/callback`;
      if (showConfigModal === 'google') {
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          cfgClientId.trim()
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&scope=openid%20profile%20email&state=google&access_type=offline&prompt=consent`;
      } else {
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
          cfgClientId.trim()
        )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email&state=github`;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể lưu cấu hình OAuth');
      setSavingConfig(false);
    }
  };

  const copyCallbackUrl = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/auth/callback`;
      navigator.clipboard.writeText(url);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-[390px] max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={() => {
            setLoginModalOpen(false);
            setShowConfigModal(null);
          }}
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          title="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center pt-0 pb-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4FF00] text-slate-950 font-black text-base mb-1.5 shadow-2xs border border-black/10">
            <Zap className="h-5 w-5 text-slate-950 fill-slate-950" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            {mode === 'login' ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Quản lý Sprint &amp; Cộng tác nhóm với AI Gemini
          </p>
        </div>

        {/* Real OAuth Buttons (Google & GitHub) */}
        <div className="space-y-2 mt-1">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
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
              <span>{socialLoading === 'google' ? 'Đang chuyển đến Google...' : 'Tiếp tục với Google'}</span>
            </div>

            {oauthConfig?.google_enabled ? (
              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[8px] font-bold text-emerald-700">
                Sẵn sàng
              </span>
            ) : (
              <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[8px] font-bold text-slate-600">
                Cấu hình
              </span>
            )}
          </button>

          {/* GitHub Button */}
          <button
            type="button"
            onClick={handleGithubClick}
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
              <span>{socialLoading === 'github' ? 'Đang chuyển đến GitHub...' : 'Tiếp tục với GitHub'}</span>
            </div>

            {oauthConfig?.github_enabled ? (
              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[8px] font-bold text-emerald-700">
                Sẵn sàng
              </span>
            ) : (
              <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[8px] font-bold text-slate-600">
                Cấu hình
              </span>
            )}
          </button>

          {/* Single Sign-On Info */}
          <button
            type="button"
            onClick={() => {
              setInfoMessage('Single Sign-On (SAML 2.0 / Okta) dành cho gói Enterprise. Vui lòng sử dụng Google, GitHub hoặc Email cá nhân/doanh nghiệp.');
            }}
            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 py-2 px-3 text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Single Sign-On (SSO)</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">SAML</span>
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

        {/* Info Alert */}
        {infoMessage && (
          <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-sky-50 border border-sky-200 p-2 text-xs text-sky-800 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-sky-600" />
            <span className="text-[11px]">{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
            <span className="text-[11px]">{errorMessage}</span>
          </div>
        )}

        {/* Real Email/Password Form */}
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
                    setInfoMessage('');
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
                    setInfoMessage('');
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

        {/* OAuth Setup Dialog (When Client ID is not yet configured) */}
        {showConfigModal && (
          <div className="absolute inset-0 z-20 flex flex-col bg-white p-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-800" />
                <h3 className="text-xs font-bold text-slate-900">
                  {showConfigModal === 'google' ? 'Cấu hình Google OAuth 2.0' : 'Cấu hình GitHub OAuth App'}
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-3 space-y-3 flex-1 overflow-y-auto text-xs text-slate-600">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 leading-relaxed">
                Để đăng nhập bằng tài khoản {showConfigModal === 'google' ? 'Google' : 'GitHub'} thật 100%, bạn cần Client ID từ trang nhà phát triển:
              </div>

              {/* Step 1 & Callback URL */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  1. Authorization Callback URL:
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-mono text-[10px] text-slate-800 truncate flex-1">
                    {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'}
                  </span>
                  <button
                    type="button"
                    onClick={copyCallbackUrl}
                    className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                    title="Sao chép Callback URL"
                  >
                    {copiedCallback ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Step 2 Link */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  2. Tạo thông tin xác thực tại:
                </div>
                {showConfigModal === 'google' ? (
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    <span>Google Cloud Console (Credentials)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <a
                    href="https://github.com/settings/developers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 hover:underline"
                  >
                    <span>GitHub Developer Settings (OAuth Apps)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Step 3 Inputs */}
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    Client ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={cfgClientId}
                    onChange={(e) => setCfgClientId(e.target.value)}
                    placeholder={
                      showConfigModal === 'google'
                        ? 'VD: 123456789-xxx.apps.googleusercontent.com'
                        : 'VD: Iv1.0123456789abcdef'
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">
                    Client Secret *
                  </label>
                  <input
                    type="password"
                    value={cfgClientSecret}
                    onChange={(e) => setCfgClientSecret(e.target.value)}
                    placeholder="Mã bí mật Client Secret"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={savingConfig || !cfgClientId.trim()}
                onClick={handleSaveConfigAndContinue}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer shadow-xs"
              >
                {savingConfig && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Lưu &amp; Tiếp tục</span>
                <ArrowRight className="h-3 w-3 text-[#D4FF00]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
