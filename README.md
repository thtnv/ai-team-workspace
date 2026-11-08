# ⚡ SyncPulse AI — Real-time Team Workspace & Task Management

> **Next-Gen Collaborative Workspace with Real-time WebSockets, MongoDB, and Google Gemini AI Assistant**  
> *Được thiết kế theo chuẩn Linear & Raycast với điểm nhấn màu Acid Lime (`#D4FF00`), tối ưu hóa độ trễ cực thấp (Sub-20ms) và giao diện Light Mode tinh gọn.*

---

## 🌟 Tính Năng Nổi Bật (Key Features)

- 🚀 **Bảng Kanban Thời Gian Thực (Multi-user Real-time Collaboration):**
  - Kéo thả thẻ mượt mà giữa các cột (*To Do, In Progress, In Review, Done*) sử dụng `@dnd-kit/core` & `@dnd-kit/sortable`.
  - **Optimistic UI Updates:** Trạng thái giao diện phản hồi tức thì (0ms latency), tự động rollback nếu gặp sự cố mạng.
  - Phân luồng Room Isolation theo Board ID (`board_{id}`) giảm 90% broadcast dư thừa.
  - **Live Presence Avatars:** Nhận diện và hiển thị avatar của tất cả thành viên đang online trên bảng theo thời gian thực (tự động dọn dẹp kết nối ma/stale socket và khử trùng lặp).
  - **Visual Task Locking:** Hiển thị ai đang xem/chỉnh sửa thẻ task để tránh xung đột dữ liệu giữa các thành viên.
  - Hiệu ứng pháo hoa Confetti ăn mừng khi hoàn thành công việc (thả task vào cột **Done**).

- 🤖 **AI Task Breakdown (Google Gemini API):**
  - Nhập 1 yêu cầu tính năng / User Story tổng quát (VD: *"Làm tính năng đăng nhập bằng Google OAuth và phân quyền"*).
  - Trợ lý AI tự động phân tích và sinh ra danh sách task con chi tiết kèm checklist, acceptance criteria, độ ưu tiên, tag và thời gian ước tính (Story points).
  - Sử dụng **Structured Outputs (Pydantic Schema)** đảm bảo 100% định dạng JSON chuẩn.
  - Hỗ trợ xem trước và nạp tự động toàn bộ task vào cột **To Do** chỉ với 1 click.

- 📝 **AI Meeting Notes to Action Items:**
  - Ghi chép hoặc dán biên bản cuộc họp nhanh.
  - Trợ lý AI trích xuất tự động: Tóm tắt tổng quan (TL;DR), Các quyết định kỹ thuật cốt lõi, và Danh sách đầu việc cần làm (Action Items) có người phụ trách rõ ràng.
  - **1-Click Convert to Task:** Chuyển đổi Action Item thành thẻ Kanban chính thức trên bảng với real-time broadcast cho toàn đội.

- 🛡️ **Kiến trúc Dữ liệu Document NoSQL & Dual-mode Engine:**
  - MongoDB async driver với **Motor**.
  - **Dual-mode In-Memory Fallback:** Tự động chuyển sang chế độ in-memory nếu chưa khởi động MongoDB, giúp nhà tuyển dụng hoặc người review có thể clone về và chạy trải nghiệm ngay lập tức mà không bắt buộc phải cài đặt MongoDB từ trước.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Lớp | Công nghệ |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, `@dnd-kit`, Zustand, Lucide Icons, Socket.io-client, Canvas Confetti |
| **Backend** | Python FastAPI, Uvicorn, Python-SocketIO (ASGI async wrapper), Pydantic v2 |
| **Database** | MongoDB (Async Motor driver) + In-memory Fallback Store |
| **AI Engine** | Google Gemini API (`google-genai` SDK với model `gemini-3.8-flash`) + Structured Outputs |
| **DevOps & Git** | Docker, Docker Compose, Git 3-branch workflow (`main`, `dev`, `feature/*`) |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Quick Start)

### 1. Clone mã nguồn
```bash
git clone https://github.com/thtnv/ai-team-workspace.git
cd ai-team-workspace
```

---

### 2. Khởi chạy dự án

#### Cách 1: Sử dụng Docker Compose (Nhanh nhất)
```bash
# Khởi chạy toàn bộ hệ thống (Frontend + Backend + MongoDB)
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API Docs (Swagger): `http://localhost:8000/docs`

---

#### Cách 2: Khởi chạy thủ công (Local Development)

##### Bước 2.1: Chạy Backend (FastAPI + Socket.IO)
```bash
cd backend

# Tạo và kích hoạt môi trường ảo Python
python -m venv venv
venv\Scripts\activate      # Trên Windows
# source venv/bin/activate # Trên macOS/Linux

# Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# Tạo file .env trong thư mục backend (nếu muốn kích hoạt AI Gemini thực tế)
# GEMINI_API_KEY="your-gemini-api-key"
# GEMINI_MODEL="gemini-3.8-flash"

# Khởi chạy server FastAPI
python -m uvicorn app.main:combined_asgi_app --host 127.0.0.1 --port 8000 --reload
```
> *Lưu ý:* Hệ thống tích hợp sẵn cơ chế **Dual-Mode**. Nếu máy tính của bạn chưa cài/bật MongoDB, Backend sẽ tự động chạy chế độ bộ nhớ tạm thời (**In-Memory**) với dữ liệu mẫu hoàn chỉnh mà không báo lỗi!

##### Bước 2.2: Chạy Frontend (Next.js)
Mở một cửa sổ Terminal mới:
```bash
cd frontend

# Cài đặt dependencies
npm install

# Khởi chạy giao diện Next.js
npm run dev
```
Truy cập `http://localhost:3000` trên trình duyệt.

---

## 🧪 Hướng Dẫn Kiểm Thử Dự Án Chi Tiết (Testing Guide)

### 1. Đăng ký & Đăng nhập tài khoản mới (Self-Registration)
Dự án hỗ trợ hệ thống Authentication JWT hoàn chỉnh, **không yêu cầu tài khoản mẫu cố định**:
1. Truy cập `http://localhost:3000`.
2. Khi hộp thoại đăng nhập xuất hiện, chuyển sang tab **"Đăng ký"**.
3. Nhập **Họ và tên**, **Email** và **Mật khẩu** tùy ý của bạn.
4. Bấm **"Tạo tài khoản"** -> Hệ thống sẽ tự động tạo tài khoản, sinh avatar định danh riêng và đăng nhập vào bảng làm việc ngay lập tức.

---

### 2. Kiểm thử Real-time Multi-user (Cộng tác thời gian thực giữa 2 người)
Đây là bài test quan trọng nhất để chứng minh tính năng WebSockets thời gian thực:
1. **Cửa sổ 1 (Trình duyệt thường):** Đăng nhập bằng tài khoản của bạn (ví dụ: `Alex Rivers` hoặc tên bạn vừa đăng ký).
2. **Cửa sổ 2 (Trình duyệt Ẩn danh - Incognito):** 
   - Truy cập `http://localhost:3000`.
   - Bấm **"Đăng ký"** một tài khoản thứ hai (ví dụ: `Sarah Chen` - `sarah@company.com`).
3. **Đặt 2 cửa sổ cạnh nhau trên màn hình và quan sát:**
   - 🟢 **Live Presence:** Thanh Navbar của cả 2 bên hiển thị ngay lập tức nhãn `Online (2)` kèm avatar của cả 2 người.
   - 🔄 **Đồng bộ kéo thả Kanban (< 20ms):** Dùng chuột kéo một thẻ task bất kỳ ở Cửa sổ 1 -> Thẻ task ở Cửa sổ 2 tự động di chuyển tức thì sang cột mới mà không cần bấm F5.
   - 🔒 **Visual Task Lock:** Click mở chi tiết 1 task ở Cửa sổ 1 -> Cửa sổ 2 lập tức hiển thị viền vàng và nhãn cảnh báo: *"🔒 [Tên bạn] đang xem..."* để chống sửa đè.
   - 🎉 **Confetti Effect:** Kéo thẻ task thả vào cột **Done** -> Bắn pháo hoa chúc mừng hoàn thành task.

---

### 3. Kiểm thử Trợ lý AI (Google Gemini)
1. **✨ AI Task Breakdown:**
   - Bấm nút **"✨ AI Breakdown"** trên Navbar.
   - Nhập một yêu cầu kỹ thuật (hoặc chọn gợi ý mẫu có sẵn) -> Bấm **"Phân rã với Gemini"**.
   - Xem kết quả phân rã thành các task con chi tiết kèm checklist.
   - Bấm **"Thêm các Task vào Kanban"** -> Toàn bộ task con sẽ được lưu vào cơ sở dữ liệu và xuất hiện ngay lập tức trên cột **To Do** của cả 2 màn hình.
2. **📝 AI Meeting Notes to Action Items:**
   - Bấm nút **"📝 Notes"** trên Navbar.
   - Chọn biên bản cuộc họp mẫu có sẵn -> Bấm **"Phân tích bằng AI"**.
   - AI trích xuất TL;DR, quyết định cốt lõi và danh sách Action Items.
   - Bấm nút **"Tạo Task"** tại bất kỳ Action Item nào -> Thẻ việc làm sẽ được sinh ra trực tiếp trên bảng Kanban.

---

## 📂 Cấu Trúc Dự Án (Project Structure)

```
ai-team-workspace/
├── backend/
│   ├── app/
│   │   ├── api/             # REST Endpoints (auth, workspaces, boards, tasks, notes, ai)
│   │   ├── core/            # Config, JWT Security, Helpers
│   │   ├── db/              # MongoDB Async Driver + In-Memory Fallback Store & Seeder
│   │   ├── schemas/         # Pydantic Schemas (Validation & Structured Outputs)
│   │   ├── services/        # AI Service (Google Gemini SDK gemini-3.8-flash)
│   │   ├── sockets/         # Socket.IO Event Handlers & Presence Management
│   │   └── main.py          # FastAPI Application & ASGI Mount
│   ├── requirements.txt     # Python Dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 15 App Router (layout, page, globals)
│   │   ├── components/      # KanbanBoard, KanbanColumn, TaskCard, Navbar, Modals
│   │   ├── lib/             # API client & Socket.IO client service
│   │   ├── store/           # Zustand Global State Management
│   │   └── types/           # TypeScript Data Interfaces
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # Điều phối khởi chạy toàn bộ dịch vụ
└── README.md                # Tài liệu hướng dẫn dự án
```

---

## 📄 License
Dự án được phát hành theo giấy phép [MIT License](LICENSE).
