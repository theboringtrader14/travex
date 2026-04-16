from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime


class CityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:   int
    code: str
    name: str
    lat:  float
    lng:  float


class TripCreate(BaseModel):
    from_city_id: int
    to_city_id:   int
    mode:         str
    travel_date:  str   # YYYY-MM-DD
    cost_inr:     int = 0
    notes:        Optional[str] = None


class TripUpdate(BaseModel):
    from_city_id: Optional[int] = None
    to_city_id:   Optional[int] = None
    mode:         Optional[str] = None
    travel_date:  Optional[str] = None
    cost_inr:     Optional[int] = None
    notes:        Optional[str] = None


class TripRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:          int
    from_city:   CityRead
    to_city:     CityRead
    mode:        str
    travel_date: date
    cost_inr:    int
    notes:       Optional[str]
    created_at:  datetime
