from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.trips import Trip, City
from app.schemas.trips import TripCreate, TripUpdate, TripRead

router = APIRouter()


@router.get("/trips")
async def list_trips(
    mode: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(Trip)
    if mode:
        query = query.where(Trip.mode == mode)
    if year:
        query = query.where(func.extract("year", Trip.travel_date) == year)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = query.order_by(Trip.travel_date.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    trips = result.scalars().all()

    return {"trips": [TripRead.model_validate(t) for t in trips], "total": total}


# IMPORTANT: /trips/timeline MUST be defined BEFORE /trips/{id}
@router.get("/trips/timeline")
async def get_timeline(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Trip).order_by(Trip.travel_date.asc())
    )
    trips = result.scalars().all()

    timeline: dict = {}
    for trip in trips:
        year = str(trip.travel_date.year)
        month = trip.travel_date.strftime("%b")
        if year not in timeline:
            timeline[year] = []
        timeline[year].append({
            "from_code": trip.from_city.code,
            "to_code":   trip.to_city.code,
            "mode":      trip.mode,
            "month":     month,
        })
    return timeline


@router.get("/trips/{trip_id}", response_model=TripRead)
async def get_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.post("/trips", response_model=TripRead, status_code=201)
async def create_trip(data: TripCreate, db: AsyncSession = Depends(get_db)):
    # Validate cities exist
    for city_id in [data.from_city_id, data.to_city_id]:
        city_result = await db.execute(select(City).where(City.id == city_id))
        if not city_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"City {city_id} not found")

    travel_date = date.fromisoformat(data.travel_date)
    trip = Trip(
        from_city_id=data.from_city_id,
        to_city_id=data.to_city_id,
        mode=data.mode,
        travel_date=travel_date,
        cost_inr=data.cost_inr,
        notes=data.notes,
    )
    db.add(trip)
    await db.flush()
    # Reload with relationships
    result = await db.execute(select(Trip).where(Trip.id == trip.id))
    trip = result.scalar_one()
    return TripRead.model_validate(trip)


@router.put("/trips/{trip_id}", response_model=TripRead)
async def update_trip(trip_id: int, data: TripUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if data.from_city_id is not None:
        trip.from_city_id = data.from_city_id
    if data.to_city_id is not None:
        trip.to_city_id = data.to_city_id
    if data.mode is not None:
        trip.mode = data.mode
    if data.travel_date is not None:
        trip.travel_date = date.fromisoformat(data.travel_date)
    if data.cost_inr is not None:
        trip.cost_inr = data.cost_inr
    if data.notes is not None:
        trip.notes = data.notes

    await db.flush()
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one()
    return TripRead.model_validate(trip)


@router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await db.delete(trip)
    return {"ok": True}
