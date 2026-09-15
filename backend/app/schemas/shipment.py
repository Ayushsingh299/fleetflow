from uuid import UUID

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.shipment import ShipmentStatus


# ============================================================
# SHIPMENT EVENT OUT
# ============================================================

class ShipmentEventOut(BaseModel):
    event_id: UUID
    shipment_id: UUID
    status: str
    timestamp: datetime
    notes: str | None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# CREATE SHIPMENT
# ============================================================

class ShipmentCreate(BaseModel):

    tracking_number: str
    source: str
    destination: str
    customer_name: str
    shipment_weight: float

    vehicle_id: UUID | None = None
    driver_id: UUID | None = None

    status: ShipmentStatus = ShipmentStatus.Created


# ============================================================
# UPDATE SHIPMENT
# ============================================================

class ShipmentUpdate(BaseModel):

    tracking_number: str | None = None
    source: str | None = None
    destination: str | None = None
    customer_name: str | None = None
    shipment_weight: float | None = None

    vehicle_id: UUID | None = None
    driver_id: UUID | None = None

    status: ShipmentStatus | None = None


# ============================================================
# SHIPMENT OUTPUT
# ============================================================

class ShipmentOut(BaseModel):

    shipment_id: UUID

    tracking_number: str
    source: str
    destination: str
    customer_name: str
    shipment_weight: float

    vehicle_id: UUID | None
    driver_id: UUID | None

    status: ShipmentStatus
    events: list[ShipmentEventOut] = []

    model_config = ConfigDict(
        from_attributes=True
    )