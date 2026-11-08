import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.core.config import settings
from app.db.mongodb import db_manager
from app.db.seed import seed_initial_data
from app.sockets.socket_manager import sio
from app.api import auth, workspaces, boards, tasks, notes, ai

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("syncpulse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to DB and seed default data
    logger.info("Starting SyncPulse AI Backend Services...")
    await db_manager.connect_to_database()
    await seed_initial_data()
    yield
    # Shutdown: Cleanly disconnect
    logger.info("Shutting down SyncPulse AI Backend...")
    await db_manager.close_database_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-time Team Workspace & Task Management with AI Assistant",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(workspaces.router, prefix=settings.API_V1_STR)
app.include_router(boards.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(notes.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "database": "in_memory_mock" if db_manager.is_in_memory else "mongodb_live",
        "docs_url": "/docs"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "in_memory" if db_manager.is_in_memory else "connected",
        "gemini_configured": bool(settings.GEMINI_API_KEY)
    }


# Wrap FastAPI with Python-SocketIO ASGI App
# This allows handling both HTTP REST API and WebSocket events on the same port!
combined_asgi_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path="/socket.io"
)

