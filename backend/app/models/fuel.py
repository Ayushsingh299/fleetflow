import uuid
from datetime import datetime
from sqlalchemy import Column, ForeignKey, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class FuelRecord(Base):
    __tablename__ = "fuel_records"

    record_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.vehicle_id"),
        nullable=False
    )
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.driver_id"),
        nullable=True
    )
    
    liters = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    odometer_reading = Column(Float, nullable=True)
    location = Column(String(255), nullable=True)
    receipt_url = Column(String(500), nullable=True)
