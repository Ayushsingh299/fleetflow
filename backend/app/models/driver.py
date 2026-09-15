import uuid

from sqlalchemy import Column, ForeignKey, String, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Driver(Base):
    __tablename__ = "drivers"

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    driver_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # ============================================================
    # USER REFERENCE
    # ============================================================

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.user_id",
            ondelete="SET NULL"
        ),
        unique=True,
        nullable=True
    )

    license_number = Column(String(50), nullable=True)
    experience_years = Column(Integer, default=0)
    address = Column(String(255), nullable=True)
    status = Column(String(50), default="Available")

    # ============================================================
    # RELATIONSHIP WITH USER
    # ============================================================

    user = relationship(
        "User",
        back_populates="driver"
    )

    # ============================================================
    # RELATIONSHIP WITH VEHICLES
    # ============================================================

    vehicles = relationship(
        "Vehicle",
        back_populates="driver"
    )