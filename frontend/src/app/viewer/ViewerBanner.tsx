'use client';

import React from 'react';
import { Eye, ShieldCheck, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const ViewerBanner: React.FC = () => {
  const { currentUser, currentWorkspace } = useStore();

  if (!currentUser || !currentWorkspace) return null;

  const currentMember = currentWorkspace.members?.find((m) => m.user_id === currentUser.id);
  const isViewer = currentMember?.role === 'viewer';

  if (!isViewer) return null;

  return (
    <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-amber-600 shrink-0" />
        <span className="font-semibold">
          Chế độ Quan sát viên (Viewer Mode):
        </span>
        <span className="text-amber-800">
          Bạn đang xem không gian này dưới quyền chỉ đọc (Read-Only). Liên hệ Quản trị viên để được cấp quyền Thành viên (Member) nếu cần sửa hoặc tạo thẻ việc.
        </span>
      </div>
      <span className="rounded-md bg-amber-200/60 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-950 shrink-0">
        Chỉ đọc
      </span>
    </div>
  );
};
