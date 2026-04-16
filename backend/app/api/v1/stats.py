from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct

from app.core.database import get_db
from app.models.trips import Trip, City
from app.schemas.trips import TripRead

router = APIRouter()


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    current_year = date.today().year

    # Total trips
    total_result = await db.execute(select(func.count()).select_from(Trip))
    total_trips = total_result.scalar_one() or 0

    # Total unique cities
    from_cities = select(Trip.from_city_id)
    to_cities   = select(Trip.to_city_id)
    all_city_ids = from_cities.union(to_cities).subquery()
    city_count_result = await db.execute(select(func.count()).select_from(all_city_ids))
    total_cities = city_count_result.scalar_one() or 0

    # Lifetime spend
    spend_result = await db.execute(select(func.sum(Trip.cost_inr)))
    lifetime_spend_inr = spend_result.scalar_one() or 0

    # This year spend
    year_spend_result = await db.execute(
        select(func.sum(Trip.cost_inr)).where(
            func.extract("year", Trip.travel_date) == current_year
        )
    )
    spend_this_year_inr = year_spend_result.scalar_one() or 0

    # By mode breakdown
    mode_result = await db.execute(
        select(Trip.mode, func.count(Trip.id), func.sum(Trip.cost_inr))
        .group_by(Trip.mode)
    )
    by_mode = {}
    for mode, count, spend in mode_result.all():
        by_mode[mode] = {"count": count, "spend": spend or 0}

    # Recent trips (5)
    recent_result = await db.execute(
        select(Trip).order_by(Trip.travel_date.desc()).limit(5)
    )
    recent_trips_orm = recent_result.scalars().all()
    recent_trips = [TripRead.model_validate(t) for t in recent_trips_orm]

    return {
        "total_trips":          total_trips,
        "total_cities":         total_cities,
        "lifetime_spend_inr":   lifetime_spend_inr,
        "spend_this_year_inr":  spend_this_year_inr,
        "by_mode":              by_mode,
        "recent_trips":         recent_trips,
    }


@router.get("/stats/arcs")
async def get_arcs(db: AsyncSession = Depends(get_db)):
    """Deduplicated route pairs for Globe3D. Groups by (from_city_id, to_city_id, mode)."""
    result = await db.execute(
        select(
            Trip.from_city_id,
            Trip.to_city_id,
            Trip.mode,
            func.count(Trip.id).label("count"),
        ).group_by(Trip.from_city_id, Trip.to_city_id, Trip.mode)
    )
    rows = result.all()

    # Load all cities once
    cities_result = await db.execute(select(City))
    city_map = {c.id: c for c in cities_result.scalars().all()}

    arcs = []
    for from_id, to_id, mode, count in rows:
        from_city = city_map.get(from_id)
        to_city   = city_map.get(to_id)
        if not from_city or not to_city:
            continue
        arcs.append({
            "from":  {"lat": from_city.lat, "lng": from_city.lng, "code": from_city.code},
            "to":    {"lat": to_city.lat,   "lng": to_city.lng,   "code": to_city.code},
            "mode":  mode,
            "count": count,
        })

    return arcs
