from uuid import UUID
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db

from app.schemas.shipment import (
    ShipmentCreate,
    ShipmentUpdate,
    ShipmentOut,
)

from app.crud.shipment import (
    create_shipment,
    get_shipments,
    get_shipment,
    update_shipment,
    delete_shipment,
)

from app.core.deps import get_current_user, require_roles
from app.crud.notification import notify_admins_and_managers, notify_dispatchers, notify_driver

from app.models.user import User, RoleEnum
from app.models.driver import Driver
from app.models.shipment import Shipment, ShipmentStatus
from app.models.shipment_event import ShipmentEvent


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/shipments",
    tags=["Shipments"],
)


# ============================================================
# CREATE SHIPMENT
# Admin / FleetManager / Dispatcher
# ============================================================

@router.post(
    "/",
    response_model=ShipmentOut,
    status_code=201,
)
def create_shipment_api(
    shipment_in: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    try:
        return create_shipment(
            db=db,
            tracking_number=shipment_in.tracking_number,
            source=shipment_in.source,
            destination=shipment_in.destination,
            customer_name=shipment_in.customer_name,
            shipment_weight=shipment_in.shipment_weight,
            vehicle_id=shipment_in.vehicle_id,
            driver_id=shipment_in.driver_id,
            status=shipment_in.status,
        )
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="A shipment with this tracking number already exists.")


# ============================================================
# GET ALL SHIPMENTS — scoped by role
# Admin / FleetManager / Dispatcher: all
# Driver: only their own (via driver profile)
# ============================================================

@router.get(
    "/",
    response_model=list[ShipmentOut],
)
def get_shipments_api(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # If Driver: find their driver profile, return only their shipments
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        driver = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver:
            return []
        from app.models.shipment import Shipment
        return (
            db.query(Shipment)
            .filter(Shipment.driver_id == driver.driver_id)
            .all()
        )

    # Admin / FleetManager / Dispatcher: all shipments
    return get_shipments(db)


# ============================================================
# GET ONE SHIPMENT
# Admin / FleetManager / Dispatcher: any
# Driver: only their own
# ============================================================

@router.get(
    "/{shipment_id}",
    response_model=ShipmentOut,
)
def get_shipment_api(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shipment = get_shipment(db, shipment_id)

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Driver: can only view their own
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        driver = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver or str(shipment.driver_id) != str(driver.driver_id):
            raise HTTPException(status_code=403, detail="You can only view your own shipments")

    return shipment


# ============================================================
# UPDATE SHIPMENT
# Admin / FleetManager / Dispatcher
# ============================================================

@router.put(
    "/{shipment_id}",
    response_model=ShipmentOut,
)
def update_shipment_api(
    shipment_id: UUID,
    shipment_in: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    shipment = get_shipment(db, shipment_id)

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    old_status = shipment.status
    update_shipment(
        db=db,
        shipment=shipment,
        tracking_number=shipment_in.tracking_number,
        source=shipment_in.source,
        destination=shipment_in.destination,
        customer_name=shipment_in.customer_name,
        shipment_weight=shipment_in.shipment_weight,
        vehicle_id=shipment_in.vehicle_id,
        driver_id=shipment_in.driver_id,
        status=shipment_in.status,
    )

    new_status = shipment.status
    if str(old_status) != str(new_status):
        if str(new_status) in ["Delayed", "Delivered", "Cancelled"]:
            alert_type = "WARNING" if str(new_status) in ["Delayed", "Cancelled"] else "INFO"
            title = f"Shipment {new_status}"
            msg = f"Shipment {shipment.tracking_number} status changed to {new_status}."
            notify_admins_and_managers(db, title, msg, alert_type)
            notify_dispatchers(db, title, msg, alert_type)
            
            if shipment.driver_id:
                notify_driver(db, shipment.driver_id, title, msg, alert_type)

    return shipment


# ============================================================
# DELETE SHIPMENT
# Admin only (hard delete); Dispatcher/FM use status=Cancelled
# ============================================================

@router.delete(
    "/{shipment_id}",
)
def delete_shipment_api(
    shipment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(RoleEnum.Admin)
    ),
):
    shipment = get_shipment(db, shipment_id)

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    shipment.status = ShipmentStatus.Cancelled
    db.commit()

    title = "Shipment Cancelled"
    msg = f"Shipment {shipment.tracking_number} has been cancelled."
    notify_admins_and_managers(db, title, msg, "WARNING")
    notify_dispatchers(db, title, msg, "WARNING")
    
    if shipment.driver_id:
        notify_driver(db, shipment.driver_id, title, msg, "WARNING")

    return {"message": "Shipment cancelled successfully"}


# ============================================================
# GET SHIPMENT HISTORY (By Customer or Vehicle)
# ============================================================

@router.get(
    "/history/search",
    response_model=list[ShipmentOut],
)
def get_shipment_history(
    customer_name: str | None = None,
    vehicle_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Shipment)
    
    if customer_name:
        query = query.filter(Shipment.customer_name.ilike(f"%{customer_name}%"))
    if vehicle_id:
        query = query.filter(Shipment.vehicle_id == vehicle_id)
        
    return query.all()


# ============================================================
# GET DELAYED ALERTS
# ============================================================

@router.get(
    "/alerts/delayed",
    response_model=list[ShipmentOut],
)
def get_delayed_shipments(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    # Returns shipments with status Delayed or expected_delivery in the past
    now_str = datetime.utcnow().isoformat()
    
    return db.query(Shipment).filter(
        (Shipment.status == ShipmentStatus.Delayed) |
        ((Shipment.expected_delivery != None) & (Shipment.expected_delivery < now_str))
    ).all()


# ============================================================
# UPDATE DELIVERY STATUS
# ============================================================

from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: str
    notes: str | None = None

@router.put(
    "/{shipment_id}/status",
    response_model=ShipmentOut,
)
def update_delivery_status(
    shipment_id: UUID,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shipment = get_shipment(db, shipment_id)

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    # Driver can only update their own
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        driver = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver or str(shipment.driver_id) != str(driver.driver_id):
            raise HTTPException(status_code=403, detail="You can only update your own shipments")

    # Validate status enum
    try:
        new_status = ShipmentStatus(status_update.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid shipment status")
        
    shipment.status = new_status
    
    # Create Event
    event = ShipmentEvent(
        shipment_id=shipment.shipment_id,
        status=new_status.value,
        notes=status_update.notes
    )
    
    db.add(event)
    db.commit()
    db.refresh(shipment)
    
    # Notification logic
    if new_status in [ShipmentStatus.Delayed, ShipmentStatus.Cancelled, ShipmentStatus.Delivered]:
        broadcast_notification(
            db,
            title=f"Shipment {new_status.value}",
            message=f"Shipment {shipment.tracking_number} is now {new_status.value}.",
            alert_type="WARNING" if new_status in [ShipmentStatus.Delayed, ShipmentStatus.Cancelled] else "SUCCESS",
            roles=[RoleEnum.Admin, RoleEnum.FleetManager, RoleEnum.Dispatcher]
        )
    
    return shipment