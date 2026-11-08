import logging
from typing import Dict, Any, Set
import socketio

logger = logging.getLogger("syncpulse.sockets")

# Create Async Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

# Active users tracker: board_id -> dict of {sid: user_info}
_active_board_presence: Dict[str, Dict[str, Dict[str, Any]]] = {}
# Mapping sid -> set of board_ids joined
_sid_to_boards: Dict[str, Set[str]] = {}


@sio.event
async def connect(sid, environ):
    logger.info(f"Socket client connected: {sid}")
    _sid_to_boards[sid] = set()
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.event
async def disconnect(sid):
    logger.info(f"Socket client disconnected: {sid}")
    if sid in _sid_to_boards:
        boards = list(_sid_to_boards[sid])
        for board_id in boards:
            if board_id in _active_board_presence and sid in _active_board_presence[board_id]:
                del _active_board_presence[board_id][sid]
                active_users = list(_active_board_presence[board_id].values())
                await sio.emit(
                    "presence:sync",
                    {"board_id": board_id, "active_users": active_users},
                    room=f"board_{board_id}"
                )
        del _sid_to_boards[sid]


@sio.event
async def join_board(sid, data: Dict[str, Any]):
    """Join a specific board room for scoped real-time collaboration."""
    board_id = data.get("board_id")
    user = data.get("user", {})
    if not board_id:
        return

    room = f"board_{board_id}"
    await sio.enter_room(sid, room)
    
    if sid not in _sid_to_boards:
        _sid_to_boards[sid] = set()
    _sid_to_boards[sid].add(board_id)

    if board_id not in _active_board_presence:
        _active_board_presence[board_id] = {}

    user_info = {
        "sid": sid,
        "user_id": user.get("id", sid),
        "name": user.get("name") or user.get("full_name") or f"Guest-{sid[:4]}",
        "email": user.get("email", ""),
        "avatar_url": user.get("avatar_url", "")
    }
    _active_board_presence[board_id][sid] = user_info

    logger.info(f"User {user_info['name']} joined board {board_id}")
    active_users = list(_active_board_presence[board_id].values())
    await sio.emit("presence:sync", {"board_id": board_id, "active_users": active_users}, room=room)


@sio.event
async def leave_board(sid, data: Dict[str, Any]):
    """Leave a specific board room."""
    board_id = data.get("board_id")
    if not board_id:
        return

    room = f"board_{board_id}"
    await sio.leave_room(sid, room)
    
    if sid in _sid_to_boards and board_id in _sid_to_boards[sid]:
        _sid_to_boards[sid].remove(board_id)

    if board_id in _active_board_presence and sid in _active_board_presence[board_id]:
        del _active_board_presence[board_id][sid]
        active_users = list(_active_board_presence[board_id].values())
        await sio.emit("presence:sync", {"board_id": board_id, "active_users": active_users}, room=room)


@sio.event
async def move_task(sid, data: Dict[str, Any]):
    """
    Handle drag-and-drop card movement event.
    Broadcasts 'task:moved' to all other peers in the room (skipping sender).
    """
    board_id = data.get("board_id")
    task_id = data.get("task_id")
    source_col_id = data.get("source_col_id")
    dest_col_id = data.get("dest_col_id")
    new_order = data.get("new_order", 0)

    if not board_id or not task_id:
        return

    room = f"board_{board_id}"
    # Broadcast to all clients in the board EXCEPT the sender (optimistic UI)
    await sio.emit(
        "task:moved",
        {
            "task_id": task_id,
            "board_id": board_id,
            "source_col_id": source_col_id,
            "dest_col_id": dest_col_id,
            "new_order": new_order,
            "moved_by_sid": sid
        },
        room=room,
        skip_sid=sid
    )


@sio.event
async def lock_task(sid, data: Dict[str, Any]):
    """Visual task lock indicator when a member opens a task details modal."""
    board_id = data.get("board_id")
    task_id = data.get("task_id")
    user_name = data.get("user_name", "Someone")
    if board_id and task_id:
        await sio.emit(
            "task:locked",
            {"task_id": task_id, "locked_by": user_name, "sid": sid},
            room=f"board_{board_id}",
            skip_sid=sid
        )


@sio.event
async def unlock_task(sid, data: Dict[str, Any]):
    """Release visual task lock."""
    board_id = data.get("board_id")
    task_id = data.get("task_id")
    if board_id and task_id:
        await sio.emit(
            "task:unlocked",
            {"task_id": task_id},
            room=f"board_{board_id}",
            skip_sid=sid
        )


async def broadcast_board_event(board_id: str, event_name: str, payload: Dict[str, Any], skip_sid: str = None):
    """Helper to broadcast general events from REST API routes."""
    room = f"board_{board_id}"
    await sio.emit(event_name, payload, room=room, skip_sid=skip_sid)

