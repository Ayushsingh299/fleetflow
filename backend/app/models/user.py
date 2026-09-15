import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# =========================================================
# ROLE ENUM
# =========================================================

class RoleEnum(str, enum.Enum):
    Admin = "Admin"
    FleetManager = "FleetManager"
    Driver = "Driver"
    Dispatcher = "Dispatcher"


# =========================================================
# USER MODEL
# =========================================================

class User(Base):
    __tablename__ = "users"

    # =====================================================
    # PRIMARY KEY
    # =====================================================

    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # =====================================================
    # BASIC INFORMATION
    # =====================================================

    full_name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    phone = Column(
        String(15),
        nullable=True
    )

    # =====================================================
    # AUTHENTICATION
    # =====================================================

    password = Column(
        String(255),
        nullable=False
    )

    otp_code = Column(
        String(6),
        nullable=True
    )

    otp_expires_at = Column(
        DateTime,
        nullable=True
    )

    # =====================================================
    # ROLE
    #
    # Currently kept as String because your existing
    # database/authentication is already working.
    #
    # Allowed values:
    # Admin
    # FleetManager
    # Driver
    # Dispatcher
    # =====================================================

    role = Column(
        Enum(
            RoleEnum,
            name="roleenum",
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        default=RoleEnum.Driver
    )

    # =====================================================
    # TIMESTAMPS
    # =====================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # =====================================================
    # DRIVER RELATIONSHIP
    # =====================================================

    driver = relationship(
        "Driver",
        back_populates="user",
        uselist=False
    )