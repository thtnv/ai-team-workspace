'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import {
  Sparkles,
  Building2,
  Kanban,
  MessageSquare,
  Search,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Check,
  Zap,
} from 'lucide-react';

export const ProductWalkthrough: React.FC = () => {
  const {
    isWalkthroughOpen,
    setWalkthroughOpen,
    currentUser,
    currentWorkspace,
    setAIBreakdownOpen,
  } = useStore();

  const [currentStep, setCurrentStep] = useState(0);

  // Auto trigger on first login
  useEffect(() => {
    if (currentUser?.id && currentWorkspace) {
      const tourKey = `syncpulse_ftue_done_${currentUser.id}`;
      const hasCompleted = localStorage.getItem(tourKey);
      if (!hasCompleted) {
        // Auto open for first time user
        setWalkthroughOpen(true);
      }
    }
  }, [currentUser?.id, currentWorkspace, setWalkthroughOpen]);

  const steps = [
    {
      id: 1,
      badge: 'Bước 1 / 5',
      tag: 'Không gian làm việc & Bảng',
      icon: Building2,
      iconColor: 'bg-blue-100 text-blue-700 border-blue-200',
      title: 'Chào mừng đến với SyncPulse AI Workspace!',
      headline: 'Trung tâm quản lý dự án & điều phối nhóm thời gian thực',
      description:
        'SyncPulse kết nối bạn và đồng đội trong cùng một Không gian làm việc số. Mọi cập nhật trạng thái thẻ việc và thành viên đang hoạt động đều được đồng bộ tức thì qua WebSockets.',
      highlights: [
        'Chọn và chuyển đổi nhanh giữa các Workspace và bảng Sprint.',
        'Theo dõi trực tiếp danh sách thành viên đang online trên thanh tiêu đề.',
        'Thanh tiến độ Sprint KPI tự động tính toán tỷ lệ hoàn thành công việc.',
      ],
    },
    {
      id: 2,
      badge: 'Bước 2 / 5',
      tag: 'Google Gemini 3.5',
      icon: Sparkles,
      iconColor: 'bg-[#D4FF00] text-slate-950 border-black/10 font-bold',
      title: 'Phân rã tính năng thông minh bằng AI Gemini',
      headline: 'Biến User Story lớn thành danh sách task con kèm Checklist chỉ 2 giây',
      description:
        'Không cần tốn thời gian viết task thủ công. Nhập bất kỳ yêu cầu nào (VD: "Đăng nhập Facebook OAuth", "Tích hợp cổng thanh toán"), trợ lý Google Gemini 3.5 sẽ tự động bóc tách kiến trúc kỹ thuật chuẩn chỉnh.',
      highlights: [
        'Tự động ước lượng thời gian thực hiện và độ ưu tiên cho từng task con.',
        'Sinh sẵn Checklist từng bước rõ ràng để kỹ sư kiểm tra khi code.',
        'Thêm toàn bộ danh sách task vào cột To Do chỉ với 1 click duy nhất.',
      ],
    },
    {
      id: 3,
      badge: 'Bước 3 / 5',
      tag: 'Kanban ⟷ List View',
      icon: Kanban,
      iconColor: 'bg-purple-100 text-purple-700 border-purple-200',
      title: 'Kéo thả thẻ việc & Chuyển đổi Chế độ xem',
      headline: 'Trải nghiệm linh hoạt giữa Bảng Kanban và Danh sách phẳng (List View)',
      description:
        'Kéo thả thẻ việc trực quan giữa 4 cột To Do ➔ In Progress ➔ In Review ➔ Done. Kéo việc vào Done sẽ kích hoạt pháo hoa vinh danh. Ngoài ra, bạn có thể bấm nút chuyển sang List View để quét nhanh hàng loạt task.',
      highlights: [
        'Kéo thả mượt mà với @dnd-kit và tối ưu chống giật lag.',
        'Cơ chế Khóa thẻ từ xa (Remote Lock) ngăn 2 người sửa đè lên nhau.',
        'Bắn pháo hoa Confetti ăn mừng thành quả khi hoàn thành công việc.',
      ],
    },
    {
      id: 4,
      badge: 'Bước 4 / 5',
      tag: 'Bình luận WebSockets',
      icon: MessageSquare,
      iconColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      title: 'Bình luận & Thảo luận kỹ thuật thời gian thực',
      headline: 'Trao đổi ý kiến, giải pháp trực tiếp bên trong từng thẻ việc',
      description:
        'Nhấp vào bất kỳ thẻ việc nào để mở modal chi tiết: tích chọn Checklist hoàn thành, đổi độ ưu tiên và viết bình luận trao đổi kỹ thuật. Bình luận mới lập tức hiển thị cho tất cả thành viên đang cùng mở xem.',
      highlights: [
        'Đồng bộ WebSockets hai chiều tức thì, không cần tải lại trang.',
        'Hiển thị Avatar người gửi và thời gian tương đối ("Vừa xong", "5 phút trước").',
        'Lưu trữ bền vững trong cơ sở dữ liệu MongoDB.',
      ],
    },
    {
      id: 5,
      badge: 'Bước 5 / 5',
      tag: 'Phím tắt năng suất',
      icon: Search,
      iconColor: 'bg-amber-100 text-amber-800 border-amber-200',
      title: 'Thanh tìm kiếm bộ lọc & Phím tắt Ctrl + K',
      headline: 'Làm việc nhanh chuẩn phong cách kỹ sư của Linear & Plane',
      description:
        'Tìm kiếm và lọc task theo từ khóa, độ ưu tiên, nhãn #tag hoặc "Việc của tôi". Nhấn phím Ctrl + K (hoặc Cmd + K) bất cứ lúc nào để mở Command Palette tìm nhanh task và kích hoạt mọi chức năng chỉ bằng bàn phím.',
      highlights: [
        'Lọc bảng Kanban và List View tức thì theo nhiều tiêu chí.',
        'Command Palette (Ctrl + K) điều hướng bằng phím mũi tên ↑ ↓ và Enter.',
        'Mở Sổ tay AI Notes để ghi chép cuộc họp và chuyển Action Items thành task.',
      ],
    },
  ];

  const handleFinish = () => {
    if (currentUser?.id) {
      localStorage.setItem(`syncpulse_ftue_done_${currentUser.id}`, 'true');
    }
    setWalkthroughOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isWalkthroughOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-slate-900 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 font-mono">
              {step.badge}
            </span>
            <span className="rounded-full bg-[#D4FF00]/40 border border-[#bce000] px-2 py-0.5 text-[10px] font-bold text-slate-900">
              {step.tag}
            </span>
          </div>

          <button
            onClick={handleFinish}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            title="Đóng / Bỏ qua hướng dẫn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Main Visual Header */}
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg shrink-0 shadow-xs border ${step.iconColor}`}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {step.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {step.headline}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            {step.description}
          </p>

          {/* Bullet Highlights */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Điểm nổi bật cốt lõi:
            </div>
            <div className="space-y-1.5">
              {step.highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-2.5 w-2.5 stroke-3" />
                  </div>
                  <span className="leading-tight">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Dots & Footer Navigation */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-between gap-3">
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-slate-900'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Chuyển đến bước ${idx + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Quay lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              <span>{currentStep === steps.length - 1 ? 'Bắt đầu làm việc' : 'Tiếp tục'}</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#D4FF00]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

