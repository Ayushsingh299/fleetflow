from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.notification import Notification
from app.core.deps import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# --------------------------------
# Schemas
# --------------------------------

class NotificationCreate(BaseModel):
    user_id: UUID
    title: Optional[str] = "System Alert"
    message: str
    alert_type: Optional[str] = "INFO"


class NotificationOut(BaseModel):
    notification_id: UUID
    user_id: UUID
    title: Optional[str] = None
    message: str
    alert_type: Optional[str] = "INFO"
    is_read: Optional[bool] = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --------------------------------
# GET ALL NOTIFICATIONS
# --------------------------------

@router.get(
    "/",
    response_model=list[NotificationOut],
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


# --------------------------------
# CREATE NOTIFICATION
# --------------------------------

@router.post(
    "/",
    response_model=NotificationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_notification(
    notification_data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification = Notification(
        user_id=notification_data.user_id,
        title=notification_data.title or "System Alert",
        message=notification_data.message,
        alert_type=notification_data.alert_type or "INFO",
        is_read=False,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


# --------------------------------
# GET SINGLE NOTIFICATION
# --------------------------------

@router.get(
    "/{notification_id}",
    response_model=NotificationOut,
)
def get_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    return notification


# --------------------------------
# MARK AS READ
# --------------------------------

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationOut,
)
def mark_notification_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    return notification


# --------------------------------
# MARK ALL AS READ
# --------------------------------

@router.post(
    "/read-all",
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return {"message": "All notifications marked as read"}


# --------------------------------
# DELETE NOTIFICATION
# --------------------------------

@router.delete(
    "/{notification_id}",
)
def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return {
        "message": "Notification deleted successfully"
    }