"""Seed 5 demo trips if trips table is empty. Idempotent."""
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.trips import Trip, City

DEMO_TRIPS = [
    ("BLR", "DEL", "air",   "2026-04-03", 6200),
    ("CHN", "CBE", "train", "2026-03-21",  890),
    ("DEL", "GOI", "air",   "2026-03-08", 4100),
    ("BLR", "MYS", "bus",   "2026-02-14",  220),
    ("MUM", "PNQ", "train", "2026-01-29",  320),
]


async def seed_demo_trips(db: AsyncSession) -> None:
    # Check if any trips exist
    count_result = await db.execute(select(func.count()).select_from(Trip))
    if (count_result.scalar_one() or 0) > 0:
        return  # Already seeded

    # Load city map
    cities_result = await db.execute(select(City))
    city_map = {c.code: c.id for c in cities_result.scalars().all()}

    for from_code, to_code, mode, travel_date_str, cost_inr in DEMO_TRIPS:
        from_id = city_map.get(from_code)
        to_id   = city_map.get(to_code)
        if not from_id or not to_id:
            continue
        trip = Trip(
            from_city_id=from_id,
            to_city_id=to_id,
            mode=mode,
            travel_date=date.fromisoformat(travel_date_str),
            cost_inr=cost_inr,
        )
        db.add(trip)

    await db.commit()
