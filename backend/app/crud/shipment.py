from sqlalchemy.orm import Session

from app.models.shipment import Shipment, ShipmentStatus


# ============================================================
# CREATE SHIPMENT
# ============================================================

def create_shipment(
    db: Session,
    tracking_number: str,
    source: str,
    destination: str,
    customer_name: str,
    shipment_weight: float,
    vehicle_id=None,
    driver_id=None,
    status=ShipmentStatus.Created,
):

    shipment = Shipment(
        tracking_number=tracking_number,
        source=source,
        destination=destination,
        customer_name=customer_name,
        shipment_weight=shipment_weight,
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        status=status,
    )

    db.add(shipment)

    db.commit()

    db.refresh(shipment)

    return shipment


# ============================================================
# GET ALL SHIPMENTS
# ============================================================

def get_shipments(
    db: Session,
):

    return (
        db.query(Shipment)
        .all()
    )


# ============================================================
# GET ONE SHIPMENT
# ============================================================

def get_shipment(
    db: Session,
    shipment_id,
):

    return (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id == shipment_id
        )
        .first()
    )


# ============================================================
# UPDATE SHIPMENT
# ============================================================

def update_shipment(
    db: Session,
    shipment,
    tracking_number=None,
    source=None,
    destination=None,
    customer_name=None,
    shipment_weight=None,
    vehicle_id=None,
    driver_id=None,
    status=None,
):

    if tracking_number is not None:
        shipment.tracking_number = tracking_number

    if source is not None:
        shipment.source = source

    if destination is not None:
        shipment.destination = destination

    if customer_name is not None:
        shipment.customer_name = customer_name

    if shipment_weight is not None:
        shipment.shipment_weight = shipment_weight

    if vehicle_id is not None:
        shipment.vehicle_id = vehicle_id

    if driver_id is not None:
        shipment.driver_id = driver_id

    if status is not None:
        shipment.status = status

    db.commit()

    db.refresh(shipment)

    return shipment


# ============================================================
# DELETE SHIPMENT
# ============================================================

def delete_shipment(
    db: Session,
    shipment,
):

    db.delete(shipment)

    db.commit()

    return True