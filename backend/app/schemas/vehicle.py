from pydantic import BaseModel
from uuid import UUID


class VehicleCreate(BaseModel):
    registration_number: str
    vehicle_type: str
    brand: str
    model: str
    manufacture_year: int
    fuel_type: str
    capacity: float
    driver_id: UUID | None = None
    status: str = "Available"


class VehicleUpdate(BaseModel):
    registration_number: str | None = None
    vehicle_type: str | None = None
    brand: str | None = None
    model: str | None = None
    manufacture_year: int | None = None
    fuel_type: str | None = None
    capacity: float | None = None
    driver_id: UUID | None = None
    status: str | None = None


class VehicleOut(BaseModel):
    vehicle_id: UUID
    registration_number: str
    vehicle_type: str
    brand: str
    model: str
    manufacture_year: int
    fuel_type: str
    capacity: float
    driver_id: UUID | None
    status: str

    class Config:
        from_attributes = True