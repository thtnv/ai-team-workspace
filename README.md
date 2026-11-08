# ⚡ SyncPulse AI — Real-time Team Workspace & Task Management

> **Next-Gen Collaborative Workspace with Real-time WebSockets, MongoDB, and Google Gemini AI Assistant**  
> *Được thiết kế chuẩn phong cách Linear & Raycast với điểm nhấn màu Acid Lime (`bg-acid`), tối ưu hóa cho hiệu năng cao và độ trễ cực thấp.*

---

## 🌟 Tính Năng Nổi Bật (Key Features)

- 🚀 **Bảng Kanban Thời Gian Thực (Multi-user Real-time Sync):**
  - Kéo thả thẻ mượt mà giữa các cột (*To Do, In Progress, In Review, Done*) sử dụng `@dnd-kit/core` & `@dnd-kit/sortable`.
  - **Optimistic UI Updates:** Trạng thái giao diện phản hồi tức thì (0ms latency), tự động rollback nếu gặp sự cố mạng.
  - Phân luồng Room Isolation theo Board ID (`board_{id}`) giảm 90% broadcast không cần thiết.
  - **Live Presence Avatars:** Hiển thị trực tiếp ai đang xem bảng cùng bạn theo thời gian thực.
  - **Visual Task Locking:** Tránh xung đột khi thành viên khác đang mở chỉnh sửa thẻ task.
  - Hiệu ứng ăn mừng hạt pháo hoa confetti khi kéo task vào cột **Done**.

- 🤖 **AI Task Breakdown (Google Gemini 2.0 / 1.5 Flash):**
  - Nhập 1 yêu cầu tính năng / User Story lớn (VD: *"Làm tính năng đăng nhập bằng Google OAuth và phân quyền"*).
  - Trợ lý AI tự động phân tích và sinh ra danh sách 4-6 task con chi tiết kèm checklist, acceptance criteria, độ ưu tiên, tag và thời gian ước tính (Story points).
  - Sử dụng **Structured Outputs (Pydantic Schema)** đảm bảo 100% định dạng JSON chuẩn.
  - Hỗ trợ xem trước và thêm toàn bộ thẻ vào bảng chỉ với 1 click.

- 📝 **AI Meeting / Notes Summarizer to Action Items:**
  - Ghi chú hoặc paste biên bản cuộc họp nhanh.
  - Trợ lý AI trích xuất tự động: Tóm tắt tổng quan (TL;DR), Các quyết định kỹ thuật cốt lõi, và Bảng Action Items phân công rõ ràng.
  - **1-Click Convert to Task:** Bấm 1 nút là Action Item được chuyển thành thẻ Kanban chính thức trên bảng với real-time broadcast cho toàn đội.

- 🛡️ **Kiến trúc Dữ liệu NoSQL & Dual-mode Engine:**
  - MongoDB async driver với **Motor**.
  - **Dual-mode In-Memory Fallback:** Tự động chuyển sang chế độ in-memory nếu chưa khởi động MongoDB, giúp người phỏng vấn/nhà tuyển dụng có thể chạy và trải nghiệm ngay lập tức mà không cần cài đặt phức tạp!

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Lớp | Công nghệ |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, `@dnd-kit`, Zustand, Lucide Icons, Socket.io-client |
| **Backend** | Python FastAPI, Uvicorn, Python-SocketIO (ASGI async wrapper), Pydantic v2 |
| **Database** | MongoDB (Async Motor driver) + In-memory fallback mode |
| **AI Engine** | Google Gemini API (`google-genai` / `google-generativeai`) with Structured Outputs |
| **DevOps** | Docker, Docker Compose |

---

## 🚀 Khởi Chạy Nhanh (Quick Start)

### Cách 1: Sử dụng Docker Compose (Khuyên dùng)
```bash
# 1. Clone repository
git clone https://github.com/your-username/syncpulse-ai.git
cd syncpulse-ai

# 2. Khởi chạy toàn bộ hệ thống (Frontend + Backend + MongoDB)
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API & Swagger Docs: `http://localhost:8000/docs`

---

### Cách 2: Chạy Thủ Công (Local Development)

#### 1. Backend (FastAPI + Socket.IO)
```bash
cd backend
# Tạo và kích hoạt virtual environment
python -m venv venv
venv\Scripts\activate      # Trên Windows
# source venv/bin/activate # Trên macOS/Linux

# Cài đặt thư viện
pip install -r requirements.txt

# Khởi chạy server
python -m uvicorn app.main:combined_asgi_app --reload --port 8000
```

#### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Truy cập `http://localhost:3000` và bắt đầu trải nghiệm!

---

## 👥 Tài Khoản Mẫu Trải Nghiệm (Demo Accounts)
Hệ thống tự động nạp sẵn dữ liệu mẫu (Workspace, Board, Tasks, Meeting Notes):
- **Email:** `demo@syncpulse.ai` | **Mật khẩu:** `demo123456`
- **Email:** `sarah.chen@syncpulse.ai` | **Mật khẩu:** `demo123456`

