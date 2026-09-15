import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    event_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    shipment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("shipments.shipment_id"),
        nullable=False
    )

    status = Column(
        String(50),
        nullable=False
    )

    timestamp = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    notes = Column(
        Text,
        nullable=True
    )

    shipment = relationship("Shipment", backref="events")
