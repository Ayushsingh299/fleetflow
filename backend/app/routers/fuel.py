from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.fuel_record import FuelRecord
from app.models.trip import Trip
from app.models.user import RoleEnum
from app.core.deps import get_current_user, require_roles


router = APIRouter(
    prefix="/fuel",
    tags=["Fuel Records"],
)


# --------------------------------
# Pydantic Schemas
# --------------------------------

class FuelCreate(BaseModel):
    vehicle_id: UUID
    driver_id: UUID | None = None
    fuel_amount: float
    fuel_cost: float
    odometer_reading: float | None = 0.0
    refill_date: datetime | None = None


class FuelUpdate(BaseModel):
    fuel_amount: float | None = None
    fuel_cost: float | None = None
    odometer_reading: float | None = None
    refill_date: datetime | None = None


class FuelOut(BaseModel):
    fuel_id: UUID
    vehicle_id: UUID | None = None
    driver_id: UUID | None = None
    fuel_amount: float | None = 0.0
    fuel_cost: float | None = 0.0
    odometer_reading: float | None = 0.0
    refill_date: datetime | None = None

    class Config:
        from_attributes = True


# =========================================================
# GET ALL FUEL RECORDS
# Admin / FleetManager: all records
# Driver: only their own records (by driver_id)
# Dispatcher: 403
# =========================================================

@router.get(
    "/",
    response_model=list[FuelOut],
)
def get_fuel_records(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = current_user.role

    # Dispatcher has no access to fuel records
    if role == RoleEnum.Dispatcher or str(role) == "Dispatcher":
        raise HTTPException(
            status_code=403,
            detail="Dispatchers do not have access to fuel records",
        )

    # Driver: own records only
    if role == RoleEnum.Driver or str(role) == "Driver":
        from app.models.driver import Driver
        driver_profile = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver_profile:
            return []
        return (
            db.query(FuelRecord)
            .filter(FuelRecord.driver_id == driver_profile.driver_id)
            .order_by(FuelRecord.refill_date.desc())
            .all()
        )

    # Admin / FleetManager: all
    return db.query(FuelRecord).order_by(FuelRecord.refill_date.desc()).all()


# =========================================================
# FUEL EFFICIENCY SUMMARY
# Admin / FleetManager only (must be before /{fuel_id})
# =========================================================

@router.get(
    "/efficiency/summary",
)
def get_fuel_efficiency_summary(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(RoleEnum.Admin, RoleEnum.FleetManager)
    ),
):
    total_fuel = db.query(func.sum(FuelRecord.fuel_amount)).scalar() or 0.0
    total_cost = db.query(func.sum(FuelRecord.fuel_cost)).scalar() or 0.0
    total_distance_km = (db.query(func.sum(Trip.distance)).scalar() or 0.0) / 1000.0

    avg_km_per_liter = (total_distance_km / total_fuel) if total_fuel > 0 else 0.0

    return {
        "total_fuel_liters": round(total_fuel, 2),
        "total_fuel_cost": round(total_cost, 2),
        "total_distance_km": round(total_distance_km, 2),
        "avg_km_per_liter": round(avg_km_per_liter, 2),
        "cost_per_km": round(total_cost / total_distance_km, 2) if total_distance_km > 0 else 0.0,
    }


# =========================================================
# LOG FUEL REFILL
# Admin / FleetManager / Driver (own vehicle)
# =========================================================

@router.post(
    "/",
    response_model=FuelOut,
    status_code=status.HTTP_201_CREATED,
)
def create_fuel_record(
    fuel_data: FuelCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = current_user.role

    # Dispatcher cannot log fuel
    if role == RoleEnum.Dispatcher or str(role) == "Dispatcher":
        raise HTTPException(
            status_code=403,
            detail="Dispatchers cannot log fuel records",
        )

    # Driver: can only log for their own vehicle
    if role == RoleEnum.Driver or str(role) == "Driver":
        from app.models.driver import Driver
        driver_profile = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver_profile:
            raise HTTPException(
                status_code=403,
                detail="No driver profile found for this user",
            )
        # Verify this vehicle is assigned to this driver
        own_vehicle_ids = [str(v.vehicle_id) for v in (driver_profile.vehicles or [])]
        if str(fuel_data.vehicle_id) not in own_vehicle_ids:
            raise HTTPException(
                status_code=403,
                detail="You can only log fuel for your own assigned vehicle",
            )
        # Force driver_id to their own profile
        fuel_data.driver_id = driver_profile.driver_id

    fuel = FuelRecord(
        vehicle_id=fuel_data.vehicle_id,
        driver_id=fuel_data.driver_id,
        fuel_amount=fuel_data.fuel_amount,
        fuel_cost=fuel_data.fuel_cost,
        odometer_reading=fuel_data.odometer_reading or 0.0,
        refill_date=fuel_data.refill_date or datetime.utcnow(),
    )

    db.add(fuel)
    db.commit()
    db.refresh(fuel)

    return fuel


# =========================================================
# GET SINGLE FUEL RECORD
# =========================================================

@router.get(
    "/{fuel_id}",
    response_model=FuelOut,
)
def get_fuel_record(
    fuel_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    fuel = (
        db.query(FuelRecord)
        .filter(FuelRecord.fuel_id == fuel_id)
        .first()
    )

    if not fuel:
        raise HTTPException(
            status_code=404,
            detail="Fuel record not found",
        )

    # Driver: can only view their own
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        from app.models.driver import Driver
        driver_profile = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver_profile or str(fuel.driver_id) != str(driver_profile.driver_id):
            raise HTTPException(
                status_code=403,
                detail="You can only view your own fuel records",
            )

    return fuel


# =========================================================
# DELETE FUEL RECORD
# Admin / FleetManager only
# =========================================================

@router.delete(
    "/{fuel_id}",
)
def delete_fuel_record(
    fuel_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(RoleEnum.Admin)
    ),
):
    fuel = (
        db.query(FuelRecord)
        .filter(FuelRecord.fuel_id == fuel_id)
        .first()
    )

    if not fuel:
        raise HTTPException(
            status_code=404,
            detail="Fuel record not found",
        )

    db.delete(fuel)
    db.commit()

    return {
        "message": "Fuel record deleted successfully"
    }