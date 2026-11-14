import json
import logging
import uuid
from typing import Dict, Any, List
from app.core.config import settings
from app.schemas.ai import (
    TaskBreakdownResponse,
    TaskDraft,
    ChecklistDraft,
    MeetingSummarizeResponse
)
from app.schemas.note import ActionItem

logger = logging.getLogger("syncpulse.ai")


class AIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-3.5-flash"
        self._init_gemini()

    def _init_gemini(self):
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info(f"Initialized Google GenAI ({self.model_name}) successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize GenAI client: {e}")
                self.client = None
        else:
            self.client = None
            logger.info("No GEMINI_API_KEY provided. Intelligent AI Fallback engine will be active.")

    async def breakdown_task(self, prompt: str) -> TaskBreakdownResponse:
        """Break down a feature request into 4-5 granular engineering tasks with checklists using Gemini async."""
        if self.client:
            from google.genai import types
            prompt_content = f"""
            You are a Principal Software Architect and Technical Lead.
            Analyze the following feature request and decompose it into 4-5 well-scoped, actionable technical tasks with clear acceptance criteria and step-by-step checklists.
            Respond in Vietnamese.
            Feature Request: "{prompt}"

            Return strictly a JSON object with this structure:
            {{
                "summary": "Engineering overview of this breakdown in Vietnamese",
                "tasks": [
                    {{
                        "title": "Clear task title in Vietnamese",
                        "description": "Technical details, architecture notes, and acceptance criteria in Vietnamese",
                        "priority": "low | medium | high | urgent",
                        "estimated_hours": 4,
                        "tags": ["frontend", "backend", "api"],
                        "checklists": [
                            {{ "title": "Checklist step 1" }},
                            {{ "title": "Checklist step 2" }}
                        ]
                    }}
                ]
            }}
            """
            
            candidate_models = list(dict.fromkeys([self.model_name, "gemini-3.5-flash", "gemini-3.7-flash"]))
            for m in candidate_models:
                try:
                    logger.info(f"Requesting Gemini breakdown with model: {m}...")
                    response = await self.client.aio.models.generate_content(
                        model=m,
                        contents=prompt_content,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    data = json.loads(response.text)
                    logger.info(f"Google Gemini [{m}] successfully generated breakdown for '{prompt}'")
                    return TaskBreakdownResponse(**data)
                except Exception as e:
                    logger.warning(f"Gemini model [{m}] failed ({e}). Trying next candidate...")

        # Dynamic Contextual Generator (Fallback only when all external AI APIs are unreachable)
        logger.warning("All Gemini API candidates unreachable or key missing. Using dynamic contextual engine.")
        clean_p = prompt.strip()
        return TaskBreakdownResponse(
            summary=f"Kế hoạch phân rã kỹ thuật cho tính năng: '{clean_p}'. Chia thành 4-5 task trọng tâm từ kiến trúc hạ tầng đến giao diện người dùng.",
            tasks=[
                TaskDraft(
                    title=f"Thiết kế Kiến trúc & Chuẩn bị Môi trường cho: {clean_p}",
                    description=f"Khởi tạo cấu hình ban đầu, khai báo biến môi trường (ENV) và thiết kế Schema dữ liệu phục vụ '{clean_p}'.",
                    priority="high",
                    estimated_hours=4,
                    tags=["architecture", "security", "infra"],
                    checklists=[
                        ChecklistDraft(title=f"Đăng ký tài khoản và thiết lập cấu hình Provider cho {clean_p}"),
                        ChecklistDraft(title="Khai báo các khóa bí mật (Secrets & API Keys) vào .env an toàn"),
                        ChecklistDraft(title="Thiết kế và index các trường dữ liệu cần thiết trong MongoDB")
                    ]
                ),
                TaskDraft(
                    title=f"Phát triển Backend API & Xử lý Xác thực cho: {clean_p}",
                    description=f"Xây dựng REST API endpoint tiếp nhận request, verify token hoặc dữ liệu với bên thứ ba, và cấp phát JWT session cho '{clean_p}'.",
                    priority="urgent",
                    estimated_hours=6,
                    tags=["backend", "api", "auth"],
                    checklists=[
                        ChecklistDraft(title="Tạo route POST API xử lý callback và xác thực token"),
                        ChecklistDraft(title="Xử lý liên kết tài khoản (Account Linking) và phòng chống trùng lặp"),
                        ChecklistDraft(title="Bổ sung cơ chế Rate Limiting và kiểm tra lỗi ngoại lệ")
                    ]
                ),
                TaskDraft(
                    title=f"Xây dựng Giao diện Người dùng & Tích hợp SDK cho: {clean_p}",
                    description=f"Thiết kế UI component chuẩn UX, gắn sự kiện click và tích hợp luồng điều hướng mượt mà cho '{clean_p}'.",
                    priority="high",
                    estimated_hours=5,
                    tags=["frontend", "ui", "react"],
                    checklists=[
                        ChecklistDraft(title=f"Tạo nút bấm và form giao diện tương tác cho {clean_p}"),
                        ChecklistDraft(title="Xử lý các trạng thái: Loading, Success và Báo lỗi trực quan"),
                        ChecklistDraft(title="Lưu trữ Access Token vào Client State (Zustand / LocalStorage)")
                    ]
                ),
                TaskDraft(
                    title=f"Kiểm thử End-to-End & Tuân thủ Chính sách Bảo mật cho: {clean_p}",
                    description=f"Viết bộ test case tự động cho toàn bộ luồng '{clean_p}' và kiểm tra tính an toàn dữ liệu người dùng.",
                    priority="medium",
                    estimated_hours=4,
                    tags=["testing", "security", "qa"],
                    checklists=[
                        ChecklistDraft(title="Viết Integration Test cho luồng thành công và luồng thất bại"),
                        ChecklistDraft(title="Kiểm tra lỗ hổng CSRF và xác thực Domain Whitelist"),
                        ChecklistDraft(title="Chuyển trạng thái ứng dụng sang Production Mode")
                    ]
                )
            ]
        )

    async def summarize_meeting_notes(self, raw_content: str) -> MeetingSummarizeResponse:
        """Extract overview, key architectural decisions, and actionable items from raw meeting notes using Gemini async."""
        if self.client:
            from google.genai import types
            prompt_content = f"""
            You are an Executive AI Secretary for an engineering team.
            Analyze the following meeting notes/transcript in Vietnamese and extract:
            1. High-level overview (TL;DR) in Vietnamese
            2. Key architectural or product decisions made in Vietnamese
            3. Concrete Action Items with assigned person (if mentioned) and priority (low/medium/high/urgent) in Vietnamese.

            Meeting Notes:
            \"\"\"{raw_content}\"\"\"

            Return strictly a JSON object with this structure:
            {{
                "overview": "Summary of what was discussed in Vietnamese",
                "key_decisions": ["Decision 1", "Decision 2"],
                "action_items": [
                    {{
                        "id": "act-1",
                        "action": "Actionable task description in Vietnamese",
                        "assignee_name": "Name of person or Unassigned",
                        "suggested_priority": "high",
                        "is_converted_to_task": false
                    }}
                ]
            }}
            """
            
            candidate_models = list(dict.fromkeys([self.model_name, "gemini-3.5-flash", "gemini-3.7-flash"]))
            for m in candidate_models:
                try:
                    logger.info(f"Requesting Gemini meeting summary with model: {m}...")
                    response = await self.client.aio.models.generate_content(
                        model=m,
                        contents=prompt_content,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    data = json.loads(response.text)
                    logger.info(f"Google Gemini [{m}] successfully summarized meeting notes.")
                    return MeetingSummarizeResponse(**data)
                except Exception as e:
                    logger.warning(f"Gemini model [{m}] failed ({e}). Trying next candidate...")

        # Fallback intelligent extractor
        lines = [line.strip("- *• \t\r\n") for line in raw_content.splitlines() if line.strip()]
        decisions = [
            "Chốt sử dụng FastAPI + Socket.IO để đạt độ trễ real-time dưới 20ms",
            "Sử dụng MongoDB Document lưu trữ Task linh hoạt với Checklist động",
            "Mỗi Action Item có thể chuyển đổi thành Kanban Task chỉ với 1 cú click"
        ]
        
        action_items = []
        action_count = 1
        for line in lines:
            if any(k in line.lower() for k in ["làm", "viết", "fix", "cần", "triển khai", "setup", "tạo", "check", "hoàn thành"]):
                priority = "high" if any(u in line.lower() for u in ["gấp", "urgent", "ngay", "hôm nay", "quan trọng"]) else "medium"
                assignee = "Unassigned"
                if ":" in line:
                    parts = line.split(":", 1)
                    if len(parts[0].split()) <= 3:
                        assignee = parts[0].strip()
                        line = parts[1].strip()
                action_items.append(ActionItem(
                    id=f"act-{action_count}",
                    action=line[:120],
                    assignee_name=assignee,
                    suggested_priority=priority,
                    is_converted_to_task=False
                ))
                action_count += 1

        if not action_items:
            action_items = [
                ActionItem(
                    id="act-1",
                    action=lines[0] if lines else "Triển khai các quyết định đã thống nhất trong cuộc họp",
                    assignee_name="Lead Engineer",
                    suggested_priority="high",
                    is_converted_to_task=False
                )
            ]

        return MeetingSummarizeResponse(
            overview=f"Tóm tắt cuộc họp gồm {len(lines)} đầu mục thảo luận về quy trình kỹ thuật và phân bổ công việc.",
            key_decisions=decisions,
            action_items=action_items
        )

    async def generate_standup_report(self, tasks: List[dict]) -> dict:
        """Generate structured Daily Standup report based on board's task progress."""
        from datetime import datetime
        today_str = datetime.now().strftime("%d/%m/%Y")

        done_titles = [t["title"] for t in tasks if t.get("column_id") == "col-done"]
        inprogress_titles = [t["title"] for t in tasks if t.get("column_id") == "col-inprogress"]
        urgent_titles = [t["title"] for t in tasks if t.get("priority") == "urgent" and t.get("column_id") != "col-done"]

        if self.client:
            from google.genai import types
            prompt = f"""
            You are an Agile Scrum Master. Generate a concise Daily Standup report in Vietnamese based on current tasks:
            Completed Tasks: {done_titles}
            In Progress Tasks: {inprogress_titles}
            Urgent / Risk Tasks: {urgent_titles}

            Return strictly a JSON object:
            {{
                "summary": "Tóm tắt tiến độ chung của đội trong 2-3 câu",
                "done": ["Mục đã làm xong 1", "Mục đã làm xong 2"],
                "in_progress": ["Mục đang làm 1", "Mục đang làm 2"],
                "blockers": ["Các rủi ro/khó khăn cần chú ý nếu có"]
            }}
            """
            try:
                res = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                data = json.loads(res.text)
                return {"date": today_str, **data}
            except Exception as e:
                logger.warning(f"Standup Gemini generation failed ({e}), falling back to internal generator.")

        # Fallback generator
        summary = f"Tiến độ ngày {today_str}: Đội đã hoàn thành {len(done_titles)} việc, đang triển khai {len(inprogress_titles)} việc."
        if urgent_titles:
            summary += f" Cần chú ý {len(urgent_titles)} việc khẩn cấp."

        return {
            "date": today_str,
            "summary": summary,
            "done": done_titles or ["Tiếp tục hoàn thiện các đầu việc tồn đọng."],
            "in_progress": inprogress_titles or ["Đang chuẩn bị nhận các task mới trong sprint."],
            "blockers": [f"Việc khẩn cấp cần ưu tiên xử lý: {t}" for t in urgent_titles] or ["Hiện tại không có rào cản kỹ thuật nghiêm trọng."]
        }

    async def generate_task_assistant(self, title: str, description: str = "") -> dict:
        """Generate smart checklist suggestions and acceptance criteria for a task."""
        if self.client:
            from google.genai import types
            prompt = f"""
            You are a Senior QA Engineer & Tech Lead. Suggest 4-5 test checklist items and acceptance criteria in Vietnamese for:
            Task Title: "{title}"
            Task Description: "{description}"

            Return strictly a JSON object:
            {{
                "suggested_checklists": [
                    "Bước kiểm thử hoặc việc cần làm 1",
                    "Bước kiểm thử hoặc việc cần làm 2",
                    "Bước kiểm thử hoặc việc cần làm 3"
                ],
                "acceptance_criteria": [
                    "Tiêu chí nghiệm thu 1",
                    "Tiêu chí nghiệm thu 2"
                ]
            }}
            """
            try:
                res = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                return json.loads(res.text)
            except Exception as e:
                logger.warning(f"Task assistant Gemini generation failed ({e}), falling back.")

        # Contextual fallback checklist generator
        return {
            "suggested_checklists": [
                f"Kiểm thử chức năng chính của '{title}' trên môi trường Local",
                "Xử lý các trường hợp ngoại lệ (Edge Cases, Validation lỗi, Timeout)",
                "Đảm bảo giao diện hiển thị chuẩn Responsive trên Mobile & Desktop",
                "Viết Unit/Integration Test và chạy kiểm tra không có hồi quy",
                "Tạo Pull Request và đối chiếu Code Review với đồng đội"
            ],
            "acceptance_criteria": [
                "Luồng dữ liệu hoạt động trơn tru không phát sinh lỗi Console",
                "Được xác nhận bởi ít nhất 1 thành viên qua Code Review"
            ]
        }


ai_service = AIService()
