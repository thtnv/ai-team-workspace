import logging

logger = logging.getLogger("syncpulse.seed")


async def seed_initial_data():
    """Seed initial data if needed. Clean slate mode enabled for real production users."""
    logger.info("Database initialized in clean real-data mode (no demo data).")
