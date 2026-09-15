from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class DriverCreate(BaseModel):
    user_id: Optional[UUID] = None


class DriverUpdate(BaseModel):
    user_id: Optional[UUID] = None


class DriverOut(BaseModel):
    driver_id: UUID
    user_id: Optional[UUID] = None

    # Vehicle information
    vehicle_ids: list[UUID] = []
    registration_numbers: list[str] = []
    vehicle_statuses: list[str] = []

    model_config = {
        "from_attributes": True
    }