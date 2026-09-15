from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.maintenance import VehicleMaintenance
from app.models.notification import Notification
from app.models.user import User, RoleEnum
from datetime import date, timedelta

@celery_app.task(name="app.tasks.maintenance.check_maintenance_alerts")
def check_maintenance_alerts():
    db = SessionLocal()
    try:
        upcoming_cutoff = date.today() + timedelta(days=7)
        due_soon = db.query(VehicleMaintenance).filter(
            VehicleMaintenance.next_service_date <= upcoming_cutoff,
            VehicleMaintenance.status != "Completed",
        ).all()

        fleet_managers = db.query(User).filter(User.role == RoleEnum.FleetManager).all()

        notifications_created = 0
        for record in due_soon:
            message = f"Vehicle {record.vehicle_id} due for service by {record.next_service_date}"
            
            for fm in fleet_managers:
                notif = Notification(
                    user_id=fm.user_id,
                    title="Maintenance Due",
                    message=message,
                    alert_type="WARNING"
                )
                db.add(notif)
                notifications_created += 1

        db.commit()
        return f"Checked maintenance — {len(due_soon)} alert(s) triggered, {notifications_created} notifications created"
    finally:
        db.close()
