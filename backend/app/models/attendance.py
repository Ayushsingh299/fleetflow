import uuid
from datetime import datetime
from sqlalchemy import Column, ForeignKey, String, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    attendance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("drivers.driver_id"),
        nullable=True
    )
    date = Column(Date, default=datetime.utcnow().date)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    status = Column(String(50), default="Present")
    remarks = Column(String(255), nullable=True)