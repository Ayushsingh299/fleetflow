import uuid
from datetime import datetime
from sqlalchemy import Column, ForeignKey, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=True
    )
    title = Column(String(200), nullable=True, default="System Alert")
    message = Column(Text, nullable=False)
    alert_type = Column(String(50), default="INFO")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)