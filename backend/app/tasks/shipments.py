from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.shipment import Shipment
from datetime import datetime, timedelta

@celery_app.task(name="app.tasks.shipments.check_delayed_shipments")
def check_delayed_shipments():
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)  # adjust threshold as needed
        now_str = datetime.utcnow().isoformat()
        overdue = db.query(Shipment).filter(
            Shipment.status != "Delivered",
            Shipment.status != "Cancelled",
            Shipment.status != "Delayed",
            Shipment.expected_delivery != None,
            Shipment.expected_delivery < now_str,
        ).all()

        for shipment in overdue:
            shipment.status = "Delayed"
            message = f"{shipment.tracking_number} marked as Delayed"
            print(f"[SHIPMENT ALERT] {message}")
            print(f"[SIMULATED EMAIL] To: admin@fleetflow.com, Subject: Delayed Shipment, Body: {message}")
            print(f"[SIMULATED SMS] To: +1234567890, Body: {message}")

        db.commit()
        return f"Checked shipments — {len(overdue)} marked Delayed"
    finally:
        db.close()
