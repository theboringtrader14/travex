"""
main.py — TRAVEX FastAPI entry point.

Lifespan:
  1. DB connection check
  2. Seed demo trips (idempotent)
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        logger.info("TRAVEX: DB connection OK")

        # Seed demo trips
        from app.seed.seed_trips import seed_demo_trips
        async with AsyncSessionLocal() as db:
            await seed_demo_trips(db)
        logger.info("TRAVEX: seed check complete")
    except Exception as e:
        logger.warning(f"TRAVEX startup warning: {e}")

    yield
    # Shutdown — nothing needed


app = FastAPI(title="TRAVEX API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import system, cities, trips, stats  # noqa: E402

app.include_router(system.router, tags=["System"])
app.include_router(cities.router, prefix="/api/v1", tags=["Cities"])
app.include_router(trips.router,  prefix="/api/v1", tags=["Trips"])
app.include_router(stats.router,  prefix="/api/v1", tags=["Stats"])
