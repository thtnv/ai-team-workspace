'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

class SocketService {
  private socket: Socket | null = null;
  private currentBoardId: string | null = null;

  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', this.socket?.id);
      if (this.currentBoardId) {
        this.socket?.emit('join_board', { board_id: this.currentBoardId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[Socket] Connection warning:', error.message);
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  joinBoard(boardId: string, user?: { id: string; name: string; email?: string; avatar_url?: string }) {
    this.currentBoardId = boardId;
    const socket = this.getSocket();
    socket.emit('join_board', { board_id: boardId, user });
  }

  leaveBoard(boardId: string) {
    if (this.socket) {
      this.socket.emit('leave_board', { board_id: boardId });
    }
    if (this.currentBoardId === boardId) {
      this.currentBoardId = null;
    }
  }

  emitMoveTask(payload: {
    task_id: string;
    board_id: string;
    source_col_id: string;
    dest_col_id: string;
    new_order: number;
  }) {
    const socket = this.getSocket();
    socket.emit('move_task', payload);
  }

  emitLockTask(boardId: string, taskId: string, userName: string) {
    const socket = this.getSocket();
    socket.emit('lock_task', { board_id: boardId, task_id: taskId, user_name: userName });
  }

  emitUnlockTask(boardId: string, taskId: string) {
    const socket = this.getSocket();
    socket.emit('unlock_task', { board_id: boardId, task_id: taskId });
  }
}

export const socketService = new SocketService();

