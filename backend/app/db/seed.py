import logging
from datetime import datetime, timezone
from app.db.mongodb import db_manager
from app.core.security import hash_password

logger = logging.getLogger("syncpulse.seed")


async def seed_initial_data():
    """Seed initial sample data if database is empty."""
    users_col = db_manager.get_collection("users")
    workspaces_col = db_manager.get_collection("workspaces")
    boards_col = db_manager.get_collection("boards")
    tasks_col = db_manager.get_collection("tasks")
    notes_col = db_manager.get_collection("notes")

    # Check if already seeded
    existing_user = await users_col.find_one({"email": "demo@syncpulse.ai"})
    if existing_user:
        logger.info("Database already seeded with demo data.")
        return

    logger.info("Seeding initial demo workspace, board, tasks and notes...")
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Create Demo Users
    demo_user = {
        "_id": "usr-demo-1",
        "email": "demo@syncpulse.ai",
        "full_name": "Alex Rivers",
        "hashed_password": hash_password("demo123456"),
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
        "created_at": now_iso
    }
    member_user = {
        "_id": "usr-member-2",
        "email": "sarah.chen@syncpulse.ai",
        "full_name": "Sarah Chen",
        "hashed_password": hash_password("demo123456"),
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces",
        "created_at": now_iso
    }
    await users_col.insert_one(demo_user)
    await users_col.insert_one(member_user)

    # 2. Create Workspace
    workspace_id = "ws-acme-eng"
    workspace = {
        "_id": workspace_id,
        "name": "HyperScale Engineering",
        "slug": "hyperscale-eng",
        "description": "Core product engineering workspace for Real-time AI Collaboration platform.",
        "owner_id": "usr-demo-1",
        "members": [
            {
                "user_id": "usr-demo-1",
                "email": "demo@syncpulse.ai",
                "full_name": "Alex Rivers",
                "role": "admin",
                "avatar_url": demo_user["avatar_url"]
            },
            {
                "user_id": "usr-member-2",
                "email": "sarah.chen@syncpulse.ai",
                "full_name": "Sarah Chen",
                "role": "member",
                "avatar_url": member_user["avatar_url"]
            }
        ],
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await workspaces_col.insert_one(workspace)

    # 3. Create Board
    board_id = "board-sprint-24"
    board = {
        "_id": board_id,
        "workspace_id": workspace_id,
        "title": "Sprint 24 - AI Workspace MVP",
        "description": "Quản lý tiến độ phát triển bảng Kanban thời gian thực và trợ lý AI.",
        "columns": [
            { "id": "col-todo", "title": "To Do", "order": 0, "color": "#94a3b8" },
            { "id": "col-inprogress", "title": "In Progress", "order": 1, "color": "#38bdf8" },
            { "id": "col-review", "title": "In Review", "order": 2, "color": "#facc15" },
            { "id": "col-done", "title": "Done", "order": 3, "color": "#4ade80" }
        ],
        "created_by": "usr-demo-1",
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await boards_col.insert_one(board)

    # 4. Create Sample Tasks
    sample_tasks = [
        {
            "_id": "task-1",
            "board_id": board_id,
            "workspace_id": workspace_id,
            "column_id": "col-todo",
            "title": "Tích hợp Google Gemini 2.0 Flash API",
            "description": "Sử dụng Structured Outputs để phân rã User Story thành danh sách 5 task con và checklist chi tiết.",
            "priority": "urgent",
            "order": 1000.0,
            "assignees": ["usr-demo-1"],
            "tags": ["AI", "Gemini", "Backend"],
            "due_date": "2026-11-15",
            "checklists": [
                { "id": "chk-1", "title": "Khởi tạo Google GenAI Client", "is_done": True },
                { "id": "chk-2", "title": "Ràng buộc Pydantic Schema cho Response", "is_done": False },
                { "id": "chk-3", "title": "Cấu hình Fallback engine khi hết quota", "is_done": True }
            ],
            "ai_generated": False,
            "created_by": "usr-demo-1",
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": "task-2",
            "board_id": board_id,
            "workspace_id": workspace_id,
            "column_id": "col-todo",
            "title": "Tối ưu hóa Collision Detection trong @dnd-kit",
            "description": "Sử dụng thuật toán closestCorners kết hợp pointerSensor với khoảng cách kích hoạt 5px để tránh drag nhầm.",
            "priority": "medium",
            "order": 2000.0,
            "assignees": ["usr-member-2"],
            "tags": ["Frontend", "dnd-kit", "UX"],
            "due_date": "2026-11-18",
            "checklists": [
                { "id": "chk-4", "title": "Cấu hình PointerSensor & TouchSensor", "is_done": False },
                { "id": "chk-5", "title": "Kiểm thử trên thiết bị di động", "is_done": False }
            ],
            "ai_generated": False,
            "created_by": "usr-demo-1",
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": "task-3",
            "board_id": board_id,
            "workspace_id": workspace_id,
            "column_id": "col-inprogress",
            "title": "Xây dựng Socket.IO Rooms Isolation theo Board ID",
            "description": "Đảm bảo các sự kiện kéo thả và presence sync chỉ phát trong room tương ứng, tránh làm nghẽn băng thông.",
            "priority": "high",
            "order": 1000.0,
            "assignees": ["usr-demo-1"],
            "tags": ["WebSockets", "FastAPI", "Realtime"],
            "due_date": "2026-11-12",
            "checklists": [
                { "id": "chk-6", "title": "Sự kiện board:join và board:leave", "is_done": True },
                { "id": "chk-7", "title": "Theo dõi danh sách active avatars", "is_done": True },
                { "id": "chk-8", "title": "Optimistic UI broadcast với skip_sid", "is_done": True }
            ],
            "ai_generated": False,
            "created_by": "usr-demo-1",
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": "task-4",
            "board_id": board_id,
            "workspace_id": workspace_id,
            "column_id": "col-review",
            "title": "AI Meeting Notes Summarizer to Action Items",
            "description": "Trích xuất quyết định kiến trúc và chuyển đổi 1-click từ Action Item thành thẻ Kanban trên bảng.",
            "priority": "high",
            "order": 1000.0,
            "assignees": ["usr-member-2"],
            "tags": ["AI", "Notes", "Automation"],
            "due_date": "2026-11-10",
            "checklists": [
                { "id": "chk-9", "title": "Prompt Engineering cho Executive TL;DR", "is_done": True },
                { "id": "chk-10", "title": "Nút bấm 1-click convert sang task", "is_done": True }
            ],
            "ai_generated": True,
            "created_by": "usr-member-2",
            "created_at": now_iso,
            "updated_at": now_iso
        },
        {
            "_id": "task-5",
            "board_id": board_id,
            "workspace_id": workspace_id,
            "column_id": "col-done",
            "title": "Thiết lập Design System Dark Mode phong cách Acid Lime",
            "description": "Phối màu nền Slate-950 kết hợp accent Acid Lime (#D4FF00), badges, typography và glassmorphism.",
            "priority": "medium",
            "order": 1000.0,
            "assignees": ["usr-demo-1", "usr-member-2"],
            "tags": ["Design", "Tailwind", "Acid"],
            "due_date": "2026-11-08",
            "checklists": [
                { "id": "chk-11", "title": "Cấu hình Tailwind palette màu bg-acid", "is_done": True },
                { "id": "chk-12", "title": "Xây dựng Button, Badge, Modal primitives", "is_done": True }
            ],
            "ai_generated": False,
            "created_by": "usr-demo-1",
            "created_at": now_iso,
            "updated_at": now_iso
        }
    ]

    for t in sample_tasks:
        await tasks_col.insert_one(t)

    # 5. Create Sample Meeting Note
    sample_note = {
        "_id": "note-sprint-planning-24",
        "workspace_id": workspace_id,
        "title": "Biên bản cuộc họp Sprint 24 - Kiến trúc AI & Real-time",
        "raw_content": """Họp Sprint Planning #24 - Ngày 08/11/2026
Người tham gia: Alex Rivers (Tech Lead), Sarah Chen (Frontend Engineer)

Mục tiêu Sprint:
1. Hoàn thành MVP Bảng Kanban cộng tác thời gian thực
2. Tích hợp Google Gemini để hỗ trợ kỹ sư phân rã bài toán và tóm tắt biên bản họp

Các quyết định đã chốt:
- Sử dụng Next.js 15 App Router kết hợp @dnd-kit vì độ mượt và hiệu năng vượt trội.
- Backend sử dụng Python FastAPI kết hợp Socket.IO chạy song song trên ASGI event loop.
- Cơ sở dữ liệu MongoDB thiết kế lưu trữ Document có nhúng danh sách Checklist động để linh hoạt mở rộng.
- Tông màu chủ đạo là Dark Theme hiện đại với màu nhấn Acid Lime mang lại cảm giác công nghệ cao.

Phân công công việc (Action Items):
- Alex: Viết Pydantic Schema cho tính năng AI Task Breakdown và kết nối Gemini 2.0 Flash (Gấp)
- Sarah: Xây dựng Modal tạo task và hoàn thiện hiệu ứng kéo thả mượt mà với @dnd-kit (Quan trọng)
- Alex: Thiết lập cơ chế Room Isolation cho WebSockets để tránh broadcast rác giữa các workspace
- Sarah: Thêm nút 1-click biến Action Item thành thẻ task trên Kanban""",
        "summary": {
            "overview": "Cuộc họp Sprint 24 chốt kiến trúc kỹ thuật cho nền tảng Kanban thời gian thực kết hợp AI trợ lý. Thống nhất sử dụng Next.js 15, FastAPI, Socket.IO và Google Gemini.",
            "key_decisions": [
                "Sử dụng Next.js 15 App Router + @dnd-kit cho trải nghiệm kéo thả tối ưu",
                "FastAPI + Socket.IO chạy trên ASGI event loop đơn nhất cho độ trễ <20ms",
                "Giao diện phong cách Dark Mode với accent Acid Lime (#D4FF00)"
            ],
            "action_items": [
                {
                    "id": "act-1",
                    "action": "Viết Pydantic Schema cho tính năng AI Task Breakdown và kết nối Gemini 2.0 Flash",
                    "assignee_name": "Alex",
                    "suggested_priority": "urgent",
                    "is_converted_to_task": True,
                    "task_id": "task-1"
                },
                {
                    "id": "act-2",
                    "action": "Xây dựng Modal tạo task và hoàn thiện hiệu ứng kéo thả mượt mà với @dnd-kit",
                    "assignee_name": "Sarah",
                    "suggested_priority": "high",
                    "is_converted_to_task": False
                },
                {
                    "id": "act-3",
                    "action": "Thiết lập cơ chế Room Isolation cho WebSockets để tránh broadcast rác",
                    "assignee_name": "Alex",
                    "suggested_priority": "high",
                    "is_converted_to_task": True,
                    "task_id": "task-3"
                },
                {
                    "id": "act-4",
                    "action": "Thêm nút 1-click biến Action Item thành thẻ task trên Kanban",
                    "assignee_name": "Sarah",
                    "suggested_priority": "medium",
                    "is_converted_to_task": False
                }
            ]
        },
        "created_by": "usr-demo-1",
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await notes_col.insert_one(sample_note)
    logger.info("Demo data seeding completed successfully!")

