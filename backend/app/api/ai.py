import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.services.ai_service import ai_service
from app.schemas.ai import (
    TaskBreakdownRequest,
    TaskBreakdownResponse,
    MeetingSummarizeRequest,
    MeetingSummarizeResponse,
    ConvertActionToTaskRequest
)
from app.schemas.task import TaskResponse, SubtaskItem
from app.api.auth import get_current_user
from app.sockets.socket_manager import broadcast_board_event

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/breakdown-task", response_model=TaskBreakdownResponse)
async def breakdown_task(req: TaskBreakdownRequest, current_user: dict = Depends(get_current_user)):
    """AI Task Breakdown endpoint leveraging Gemini API or intelligent decomposition."""
    if not req.prompt or len(req.prompt.strip()) < 3:
        raise HTTPException(status_code=400, detail="Prompt must be at least 3 characters.")
    
    result = await ai_service.breakdown_task(req.prompt)
    return result


@router.post("/summarize-notes", response_model=MeetingSummarizeResponse)
async def summarize_notes(req: MeetingSummarizeRequest, current_user: dict = Depends(get_current_user)):
    """AI Meeting Notes Summarizer extracting TL;DR, key decisions, and action items."""
    if not req.raw_content or len(req.raw_content.strip()) < 5:
        raise HTTPException(status_code=400, detail="Meeting content must be provided.")
    
    result = await ai_service.summarize_meeting_notes(req.raw_content)

    # If note_id was passed, automatically save the summary to the note in DB
    if req.note_id:
        notes_col = db_manager.get_collection("notes")
        await notes_col.update_one(
            {"_id": req.note_id},
            {"$set": {"summary": result.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    return result


@router.post("/convert-action-to-task", response_model=TaskResponse)
async def convert_action_to_task(req: ConvertActionToTaskRequest, current_user: dict = Depends(get_current_user)):
    """
    1-Click Convert an Action Item from Meeting Notes directly into a Kanban Task.
    Inserts task into database, emits real-time event to all board members.
    """
    tasks_col = db_manager.get_collection("tasks")
    task_id = f"task-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user["_id"])

    action = req.action_item
    doc = {
        "_id": task_id,
        "board_id": req.board_id,
        "workspace_id": req.workspace_id,
        "column_id": req.column_id or "col-todo",
        "title": action.action,
        "description": f"Chuyển đổi từ Action Item biên bản họp.\nPhân công dự kiến: {action.assignee_name or 'Chưa gán'}",
        "priority": action.suggested_priority or "medium",
        "order": 1000.0,
        "assignees": [user_id],
        "tags": ["MeetingAction", "AI"],
        "due_date": None,
        "checklists": [
            {"id": f"chk-{uuid.uuid4().hex[:6]}", "title": action.action, "is_done": False}
        ],
        "ai_generated": True,
        "created_by": user_id,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await tasks_col.insert_one(doc)

    res = TaskResponse(
        id=task_id,
        board_id=doc["board_id"],
        workspace_id=doc["workspace_id"],
        column_id=doc["column_id"],
        title=doc["title"],
        description=doc["description"],
        priority=doc["priority"],
        order=doc["order"],
        assignees=doc["assignees"],
        tags=doc["tags"],
        due_date=doc["due_date"],
        checklists=[SubtaskItem(**c) for c in doc["checklists"]],
        ai_generated=doc["ai_generated"],
        created_by=user_id,
        created_at=now_iso,
        updated_at=now_iso
    )

    # Real-time Broadcast: Broadcast card arrival to everyone in the board
    await broadcast_board_event(
        board_id=req.board_id,
        event_name="task:created",
        payload={"task": res.model_dump()}
    )

    return res

