import uuid
import enum

from sqlalchemy import Column, String, Float, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


# ============================================================
# SHIPMENT STATUS
# ============================================================

class ShipmentStatus(str, enum.Enum):

    Created = "Created"
    Assigned = "Assigned"
    In_Transit = "In Transit"
    Delayed = "Delayed"
    Delivered = "Delivered"
    Cancelled = "Cancelled"


# ============================================================
# SHIPMENT MODEL
# ============================================================

class Shipment(Base):

    __tablename__ = "shipments"

    # --------------------------------------------------------
    # Shipment ID
    # --------------------------------------------------------

    shipment_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # --------------------------------------------------------
    # Tracking Number
    # --------------------------------------------------------

    tracking_number = Column(
        String(100),
        unique=True,
        nullable=False
    )

    # --------------------------------------------------------
    # Source
    # --------------------------------------------------------

    source = Column(
        String(255),
        nullable=False
    )

    # --------------------------------------------------------
    # Destination
    # --------------------------------------------------------

    destination = Column(
        String(255),
        nullable=False
    )

    # --------------------------------------------------------
    # Customer
    # --------------------------------------------------------

    customer_name = Column(
        String(150),
        nullable=False
    )

    # --------------------------------------------------------
    # Weight
    # --------------------------------------------------------

    shipment_weight = Column(
        Float,
        nullable=False
    )

    # --------------------------------------------------------
    # Vehicle
    # --------------------------------------------------------

    vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.vehicle_id"),
        nullable=True
    )

    # --------------------------------------------------------
    # Driver
    # --------------------------------------------------------

    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.driver_id"),
        nullable=True
    )

    # --------------------------------------------------------
    # Status
    # --------------------------------------------------------

    status = Column(
        Enum(
            ShipmentStatus,
            name="shipmentstatus"
        ),
        nullable=False,
        default=ShipmentStatus.Created
    )

    # --------------------------------------------------------
    # Expected Delivery
    # --------------------------------------------------------

    expected_delivery = Column(
        String(255),
        nullable=True
    )