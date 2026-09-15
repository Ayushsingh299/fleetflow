from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User, RoleEnum
from app.models.driver import Driver
from app.services.notifications_external import send_email, send_sms, send_push_notification
from uuid import UUID

def create_notification(db: Session, user_id: UUID, title: str, message: str, alert_type: str = "INFO"):
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        alert_type=alert_type,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def _dispatch_notification_to_user(db: Session, user: User, title: str, message: str, alert_type: str):
    notif = Notification(
        user_id=user.user_id,
        title=title,
        message=message,
        alert_type=alert_type,
        is_read=False
    )
    db.add(notif)

    # EXTERNAL DISPATCH (Mock)
    if user.email:
        send_email(user.email, title, message)
    if user.phone:
        send_sms(user.phone, message)
    # Mocking a device token for push notification
    device_token = f"device_token_for_{user.user_id}"
    send_push_notification(device_token, title, message)


def notify_admins_and_managers(db: Session, title: str, message: str, alert_type: str = "INFO"):
    """Send a notification to all Admins and Fleet Managers."""
    users = db.query(User).filter(User.role.in_([RoleEnum.Admin, RoleEnum.FleetManager])).all()
    for user in users:
        _dispatch_notification_to_user(db, user, title, message, alert_type)
    if users:
        db.commit()


def notify_dispatchers(db: Session, title: str, message: str, alert_type: str = "INFO"):
    """Send a notification to all Dispatchers."""
    users = db.query(User).filter(User.role == RoleEnum.Dispatcher).all()
    for user in users:
        _dispatch_notification_to_user(db, user, title, message, alert_type)
    if users:
        db.commit()


def notify_driver(db: Session, driver_id: UUID, title: str, message: str, alert_type: str = "INFO"):
    """Send a notification to a specific Driver."""
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if driver and driver.user:
        _dispatch_notification_to_user(db, driver.user, title, message, alert_type)
        db.commit()


def broadcast_notification(db: Session, title: str, message: str, alert_type: str = "INFO", roles: list[RoleEnum] = None):
    """(Legacy) Send a notification to all users matching specific roles."""
    query = db.query(User)
    if roles:
        query = query.filter(User.role.in_(roles))
    
    users = query.all()
    for user in users:
        _dispatch_notification_to_user(db, user, title, message, alert_type)
    
    if users:
        db.commit()
