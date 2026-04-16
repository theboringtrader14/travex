from sqlalchemy import Column, Integer, String, Float, Date, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class City(Base):
    __tablename__ = "cities"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(6), nullable=False, unique=True)
    name       = Column(String(100), nullable=False)
    lat        = Column(Float, nullable=False)
    lng        = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Trip(Base):
    __tablename__ = "trips"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    from_city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    to_city_id   = Column(Integer, ForeignKey("cities.id"), nullable=False)
    mode         = Column(String(10), nullable=False)   # air|train|bus|road
    travel_date  = Column(Date, nullable=False)
    cost_inr     = Column(Integer, nullable=False, default=0)
    notes        = Column(Text, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    from_city = relationship("City", foreign_keys=[from_city_id], lazy="joined")
    to_city   = relationship("City", foreign_keys=[to_city_id],   lazy="joined")
