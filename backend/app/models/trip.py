import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Enum
from sqlalchemy.dialects.postgresql import UUID
import enum

from app.database import Base

class TripStatus(str, enum.Enum):
    Scheduled = "Scheduled"
    In_Progress = "In Progress"
    Completed = "Completed"
    Cancelled = "Cancelled"


class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.vehicle_id"),
        nullable=False
    )

    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.driver_id"),
        nullable=False
    )

    shipment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("shipments.shipment_id"),
        nullable=False
    )

    start_location = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)

    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)

    distance = Column(Float, nullable=True)

    status = Column(
        Enum(
            TripStatus,
            name="tripstatus",
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        default=TripStatus.Scheduled
    )

    route_type = Column(
        String(50),
        nullable=True,
        default="Fastest"
    )

    route_geometry = Column(
        String,
        nullable=True
    )

    estimated_duration = Column(
        String(50),
        nullable=True
    )