'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { socketService } from '@/lib/socket';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Zap } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentUser,
    setCurrentUser,
    setWorkspaces,
    setCurrentWorkspace,
    setBoards,
    setCurrentBoard,
    setTasks,
    setNotes,
    setOnboardingOpen,
  } = useStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Đang khởi tạo kết nối bảo mật...');
  const [errorMessage, setErrorMessage] = useState('');
  const [authUserInfo, setAuthUserInfo] = useState<any>(null);

  // Guard against React StrictMode invoking useEffect twice in development
  const exchangeCalledRef = useRef(false);

  useEffect(() => {
    // If already called in this lifecycle, do not send duplicate requests
    if (exchangeCalledRef.current) return;
    exchangeCalledRef.current = true;

    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state') || '';
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || `Xác thực thất bại từ nhà cung cấp (${error})`);
        return;
      }

      if (!code) {
        // If user already has an active session, navigate to dashboard
        if (api.getToken() || currentUser) {
          router.replace('/');
          return;
        }
        setStatus('error');
        setErrorMessage('Không nhận được mã xác thực (Authorization Code) từ nhà cung cấp.');
        return;
      }

      const redirectUri = `${window.location.origin}/auth/callback`;
      const isGitHub = state.includes('github');
      const providerName = isGitHub ? 'GitHub' : 'Google';

      setStatusMessage(`Đang trao đổi mã bảo mật với máy chủ ${providerName}...`);

      try {
        let authResult;
        if (isGitHub) {
          authResult = await api.exchangeGithubCode(code, redirectUri);
        } else {
          authResult = await api.exchangeGoogleCode(code, redirectUri);
        }

        const user = authResult.user;
        setAuthUserInfo(user);
        setCurrentUser(user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('syncpulse_last_provider', isGitHub ? 'github' : 'google');
        }

        setStatusMessage(`Đang tải dữ liệu không gian làm việc của ${user.full_name}...`);

        // Load workspaces
        try {
          const workspaces = await api.getWorkspaces();
          setWorkspaces(workspaces);

          if (workspaces.length === 0) {
            setCurrentWorkspace(null);
            setCurrentBoard(null);
            setTasks([]);
            setOnboardingOpen(true);
          } else {
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
          }
        } catch (wsErr) {
          console.warn('Workspace sync warning:', wsErr);
        }

        setStatus('success');
        setStatusMessage('Đăng nhập thành công! Đang chuyển đến bảng làm việc...');

        setTimeout(() => {
          router.replace('/');
        }, 600);
      } catch (err: any) {
        console.error('OAuth exchange error:', err);
        // If the token is already present (e.g. from concurrent successful call), don't show error
        if (api.getToken()) {
          setStatus('success');
          setStatusMessage('Đăng nhập thành công! Đang chuyển đến bảng làm việc...');
          setTimeout(() => {
            router.replace('/');
          }, 400);
          return;
        }

        setStatus('error');
        setErrorMessage(
          err.message || 'Không thể hoàn tất xác thực OAuth. Vui lòng kiểm tra lại cấu hình client ID/secret.'
        );
      }
    };

    handleAuthCallback();
  }, [searchParams, router, currentUser, setCurrentUser, setWorkspaces, setCurrentWorkspace, setBoards, setCurrentBoard, setTasks, setNotes, setOnboardingOpen]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
        {/* Brand */}
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4FF00] text-slate-950 font-black text-lg mb-3 shadow-xs border border-black/10">
          <Zap className="h-5 w-5 text-slate-950 fill-slate-950" />
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">SyncPulse AI</h2>
        <p className="text-xs text-slate-500 mb-5">Xác thực tài khoản an toàn</p>

        {status === 'loading' && (
          <div className="py-6 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900 mx-auto" />
            <p className="text-xs font-medium text-slate-600">{statusMessage}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 space-y-3 animate-in fade-in duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            {authUserInfo && (
              <div className="flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {authUserInfo.avatar_url && (
                  <img
                    src={authUserInfo.avatar_url}
                    alt={authUserInfo.full_name}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 rounded-full border border-slate-300"
                  />
                )}
                <div className="text-left text-xs">
                  <div className="font-bold text-slate-900">{authUserInfo.full_name}</div>
                  <div className="text-[10px] text-slate-500">{authUserInfo.email}</div>
                </div>
              </div>
            )}
            <p className="text-xs font-semibold text-emerald-700">{statusMessage}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-3 animate-in fade-in duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 text-left font-medium leading-relaxed">
              {errorMessage}
            </div>
            <button
              onClick={() => router.replace('/')}
              className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại trang chủ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
