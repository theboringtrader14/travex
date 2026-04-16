from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.trips import City
from app.schemas.trips import CityRead

router = APIRouter()


@router.get("/cities", response_model=list[CityRead])
async def list_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(City).order_by(City.name))
    return result.scalars().all()


@router.post("/cities", response_model=CityRead, status_code=201)
async def create_city(
    code: str,
    name: str,
    lat: float,
    lng: float,
    db: AsyncSession = Depends(get_db),
):
    city = City(code=code, name=name, lat=lat, lng=lng)
    db.add(city)
    await db.flush()
    await db.refresh(city)
    return city
