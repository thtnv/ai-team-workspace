import logging
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("syncpulse.db")


class InMemoryAsyncCollection:
    """In-memory async mock collection to allow zero-config fallback when MongoDB is offline."""
    def __init__(self, name: str):
        self.name = name
        self._data: Dict[str, Dict[str, Any]] = {}

    async def insert_one(self, doc: Dict[str, Any]):
        doc_id = str(doc.get("_id", f"mock_{len(self._data) + 1}"))
        doc["_id"] = doc_id
        self._data[doc_id] = doc.copy()
        class Result:
            inserted_id = doc_id
        return Result()

    async def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for item in self._data.values():
            match = True
            for k, v in filter_query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                return item.copy()
        return None

    def find(self, filter_query: Optional[Dict[str, Any]] = None):
        filter_query = filter_query or {}
        results = []
        for item in self._data.values():
            match = True
            for k, v in filter_query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                results.append(item.copy())

        class AsyncCursor:
            def __init__(self, data):
                self._data = data

            def sort(self, key, direction=1):
                reverse = direction == -1
                self._data.sort(key=lambda x: x.get(key, 0), reverse=reverse)
                return self

            async def to_list(self, length: Optional[int] = None):
                if length is not None:
                    return self._data[:length]
                return self._data

            def __aiter__(self):
                self._iter = iter(self._data)
                return self

            async def __anext__(self):
                try:
                    return next(self._iter)
                except StopIteration:
                    raise StopAsyncIteration

        return AsyncCursor(results)

    async def update_one(self, filter_query: Dict[str, Any], update_doc: Dict[str, Any]):
        item = await self.find_one(filter_query)
        if not item:
            class Result:
                matched_count = 0
                modified_count = 0
            return Result()

        doc_id = str(item["_id"])
        target = self._data[doc_id]
        if "$set" in update_doc:
            for k, v in update_doc["$set"].items():
                target[k] = v
        if "$push" in update_doc:
            for k, v in update_doc["$push"].items():
                if k not in target or not isinstance(target[k], list):
                    target[k] = []
                target[k].append(v)

        class Result:
            matched_count = 1
            modified_count = 1
        return Result()

    async def delete_one(self, filter_query: Dict[str, Any]):
        item = await self.find_one(filter_query)
        if item:
            doc_id = str(item["_id"])
            del self._data[doc_id]
            class Result:
                deleted_count = 1
            return Result()
        class Result:
            deleted_count = 0
        return Result()

    async def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        cursor = self.find(filter_query)
        res = await cursor.to_list(None)
        return len(res)


class InMemoryAsyncDatabase:
    """Simulated MongoDB database for offline / test environments."""
    def __init__(self):
        self._collections: Dict[str, InMemoryAsyncCollection] = {}

    def get_collection(self, name: str) -> InMemoryAsyncCollection:
        if name not in self._collections:
            self._collections[name] = InMemoryAsyncCollection(name)
        return self._collections[name]

    def __getitem__(self, name: str) -> InMemoryAsyncCollection:
        return self.get_collection(name)


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase | InMemoryAsyncDatabase] = None
    is_in_memory: bool = False

    async def connect_to_database(self):
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=2500
            )
            # Ping database to test connection
            await self.client.admin.command('ping')
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_in_memory = False
            logger.info("Successfully connected to live MongoDB!")
        except Exception as e:
            logger.warning(
                f"Live MongoDB not available ({e}). Falling back to high-performance In-Memory Database for local development."
            )
            self.client = None
            self.db = InMemoryAsyncDatabase()
            self.is_in_memory = True

    async def close_database_connection(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    def get_collection(self, name: str):
        if self.db is None:
            raise RuntimeError("Database is not initialized. Call connect_to_database() first.")
        return self.db.get_collection(name)


db_manager = DatabaseManager()

