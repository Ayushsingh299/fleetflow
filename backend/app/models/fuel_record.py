import uuid
from datetime import datetime
from sqlalchemy import Column, ForeignKey, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class FuelRecord(Base):
    __tablename__ = "fuel_records"

    fuel_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.vehicle_id"),
        nullable=True
    )
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.driver_id"),
        nullable=True
    )
    fuel_amount = Column(Float, nullable=True, default=0.0)
    fuel_cost = Column(Float, nullable=True, default=0.0)
    odometer_reading = Column(Float, nullable=True, default=0.0)
    refill_date = Column(DateTime, default=datetime.utcnow)