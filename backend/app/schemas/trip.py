from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TripCreate(BaseModel):
    vehicle_id: UUID
    driver_id: UUID
    shipment_id: UUID

    start_location: str
    destination: str

    start_time: datetime | None = None
    end_time: datetime | None = None

    distance: float | None = None


class TripOut(BaseModel):
    trip_id: UUID

    vehicle_id: UUID
    driver_id: UUID
    shipment_id: UUID

    start_location: str
    destination: str

    start_time: datetime | None = None
    end_time: datetime | None = None

    distance: float | None = None
    status: str

    class Config:
        from_attributes = True