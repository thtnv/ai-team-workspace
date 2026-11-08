import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse, NoteSummary
from app.api.auth import get_current_user

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("", response_model=List[NoteResponse])
async def list_notes(workspace_id: str, current_user: dict = Depends(get_current_user)):
    notes_col = db_manager.get_collection("notes")
    cursor = notes_col.find({"workspace_id": workspace_id}).sort("updated_at", -1)
    notes = await cursor.to_list(100)

    res = []
    for n in notes:
        summary = NoteSummary(**n["summary"]) if n.get("summary") else None
        res.append(NoteResponse(
            id=str(n["_id"]),
            workspace_id=n["workspace_id"],
            title=n["title"],
            raw_content=n["raw_content"],
            summary=summary,
            created_by=n.get("created_by"),
            created_at=n.get("created_at", ""),
            updated_at=n.get("updated_at", "")
        ))
    return res


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    notes_col = db_manager.get_collection("notes")
    note = await notes_col.find_one({"_id": note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    summary = NoteSummary(**note["summary"]) if note.get("summary") else None
    return NoteResponse(
        id=str(note["_id"]),
        workspace_id=note["workspace_id"],
        title=note["title"],
        raw_content=note["raw_content"],
        summary=summary,
        created_by=note.get("created_by"),
        created_at=note.get("created_at", ""),
        updated_at=note.get("updated_at", "")
    )


@router.post("", response_model=NoteResponse)
async def create_note(req: NoteCreate, current_user: dict = Depends(get_current_user)):
    notes_col = db_manager.get_collection("notes")
    note_id = f"note-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user["_id"])

    doc = {
        "_id": note_id,
        "workspace_id": req.workspace_id,
        "title": req.title,
        "raw_content": req.raw_content,
        "summary": None,
        "created_by": user_id,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await notes_col.insert_one(doc)

    return NoteResponse(
        id=note_id,
        workspace_id=doc["workspace_id"],
        title=doc["title"],
        raw_content=doc["raw_content"],
        summary=None,
        created_by=user_id,
        created_at=now_iso,
        updated_at=now_iso
    )


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, req: NoteUpdate, current_user: dict = Depends(get_current_user)):
    notes_col = db_manager.get_collection("notes")
    note = await notes_col.find_one({"_id": note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_fields = {}
    if req.title is not None:
        update_fields["title"] = req.title
    if req.raw_content is not None:
        update_fields["raw_content"] = req.raw_content
    if req.summary is not None:
        update_fields["summary"] = req.summary.model_dump()

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    await notes_col.update_one({"_id": note_id}, {"$set": update_fields})

    updated_doc = await notes_col.find_one({"_id": note_id})
    summary = NoteSummary(**updated_doc["summary"]) if updated_doc.get("summary") else None
    return NoteResponse(
        id=str(updated_doc["_id"]),
        workspace_id=updated_doc["workspace_id"],
        title=updated_doc["title"],
        raw_content=updated_doc["raw_content"],
        summary=summary,
        created_by=updated_doc.get("created_by"),
        created_at=updated_doc.get("created_at", ""),
        updated_at=updated_doc.get("updated_at", "")
    )


@router.delete("/{note_id}")
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    notes_col = db_manager.get_collection("notes")
    res = await notes_col.delete_one({"_id": note_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "deleted", "note_id": note_id}

