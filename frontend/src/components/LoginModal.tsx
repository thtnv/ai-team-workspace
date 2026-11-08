'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { X, Lock, Mail, User, Loader2, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    setCurrentUser,
    currentBoard,
    setWorkspaces,
    setCurrentWorkspace,
    setBoards,
    setCurrentBoard,
    setTasks,
    setNotes,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isLoginModalOpen) return null;

  const refreshWorkspaceData = async (user: any) => {
    try {
      const workspaces = await api.getWorkspaces();
      setWorkspaces(workspaces);
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

      setCurrentUser(data.user);
      await refreshWorkspaceData(data.user);
      setLoginModalOpen(false);
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="relative flex flex-col w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4FF00] text-slate-950 font-bold border border-black/10">
              {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mode === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {mode === 'login'
                  ? 'Nhập email và mật khẩu của bạn để vào Workspace'
                  : 'Đăng ký tài khoản thành viên để cộng tác thời gian thực'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setLoginModalOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 mt-4">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage('');
            }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Họ và tên *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#84CC16] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Địa chỉ Email *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#84CC16] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Mật khẩu *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#84CC16] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#D4FF00] py-2.5 text-xs font-bold text-slate-950 hover:bg-[#bce000] disabled:opacity-50 transition cursor-pointer shadow-xs border border-black/10"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{mode === 'login' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}</span>
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
                className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
              >
                Đăng ký tài khoản mới
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
                className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
              >
                Đăng nhập tại đây
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
