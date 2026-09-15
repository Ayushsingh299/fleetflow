import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    ForeignKey,
    Enum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
import enum

class VehicleStatus(str, enum.Enum):
    Available = "Available"
    Assigned = "Assigned"
    Maintenance = "Maintenance"
    In_Transit = "In Transit"


# ============================================================
# VEHICLE MODEL
# ============================================================

class Vehicle(Base):
    __tablename__ = "vehicles"

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    vehicle_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ========================================================
    # VEHICLE REGISTRATION NUMBER
    # ========================================================

    registration_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # ========================================================
    # VEHICLE TYPE
    # ========================================================

    vehicle_type = Column(
        String(50),
        nullable=False,
    )

    # ========================================================
    # BRAND
    # ========================================================

    brand = Column(
        String(100),
        nullable=False,
    )

    # ========================================================
    # MODEL
    # ========================================================

    model = Column(
        String(100),
        nullable=False,
    )

    # ========================================================
    # YEAR OF MANUFACTURE
    # ========================================================

    manufacture_year = Column(
        Integer,
        nullable=False,
    )

    # ========================================================
    # FUEL TYPE
    # ========================================================

    fuel_type = Column(
        String(50),
        nullable=False,
    )

    # ========================================================
    # CAPACITY
    # ========================================================

    capacity = Column(
        Float,
        nullable=False,
    )

    # ========================================================
    # ASSIGNED DRIVER
    # ========================================================

    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "drivers.driver_id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # ========================================================
    # VEHICLE STATUS
    # ========================================================

    status = Column(
        Enum(
            VehicleStatus,
            name="vehiclestatus",
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        default=VehicleStatus.Available,
    )

    # ========================================================
    # RELATIONSHIP WITH DRIVER
    # ========================================================

    driver = relationship(
        "Driver",
        back_populates="vehicles",
    )