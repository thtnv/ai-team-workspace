'use client';

import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  UserPlus,
  Sparkles,
  ArrowRight,
  Clock,
  X,
} from 'lucide-react';
import { NotificationItem } from '@/types';

export const NotificationCenter: React.FC = () => {
  const {
    currentUser,
    notifications,
    unreadNotificationsCount,
    setNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isNotificationsOpen,
    setNotificationsOpen,
    tasks,
    setSelectedTaskForDetail,
  } = useStore();

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    if (currentUser) {
      api.getNotifications()
        .then((items) => setNotifications(items))
        .catch((err) => console.warn('Could not load notifications:', err));
    }
  }, [currentUser, setNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationsOpen, setNotificationsOpen]);

  if (!currentUser) return null;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      markNotificationAsRead(notif.id);
      api.markNotificationRead(notif.id).catch(console.warn);
    }
    if (notif.task_id) {
      const foundTask = tasks.find((t) => t.id === notif.task_id);
      if (foundTask) {
        setSelectedTaskForDetail(foundTask);
      }
    }
    setNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    markAllNotificationsAsRead();
    api.markAllNotificationsRead().catch(console.warn);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setNotificationsOpen(!isNotificationsOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer shadow-2xs"
        title="Thông báo của bạn"
      >
        <Bell className="h-4 w-4" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-xs animate-pulse">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isNotificationsOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">Thông báo</h3>
              {unreadNotificationsCount > 0 && (
                <span className="rounded-full bg-[#D4FF00] px-2 py-0.2 text-[10px] font-black text-slate-950">
                  {unreadNotificationsCount} mới
                </span>
              )}
            </div>

            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Bell className="h-7 w-7 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">Chưa có thông báo nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Bạn sẽ nhận thông báo khi được phân công việc hoặc có người bình luận.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.is_read;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3 text-left transition cursor-pointer ${
                      isUnread
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon based on action type */}
                    <div className="mt-0.5 shrink-0">
                      {notif.action_type === 'assigned' ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                          <UserPlus className="h-3.5 w-3.5" />
                        </div>
                      ) : notif.action_type === 'comment' ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4FF00] text-slate-950">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
