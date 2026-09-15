from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.driver import Driver
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleUpdate,
    VehicleOut,
)
from app.crud.vehicle import (
    create_vehicle,
    get_all_vehicles,
    get_vehicle_by_id,
    update_vehicle,
    delete_vehicle,
)
from app.core.deps import get_current_user, require_roles
from app.crud.notification import notify_driver
from app.models.driver import Driver


router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)


# --------------------------------
# CREATE VEHICLE
# Admin / Fleet Manager only
# --------------------------------

@router.post(
    "/",
    response_model=VehicleOut,
    status_code=201
)
def create_vehicle_api(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if current_user.role not in [
        RoleEnum.Admin,
        RoleEnum.FleetManager,
    ]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or Fleet Manager can create vehicles",
        )

    return create_vehicle(
        db,
        vehicle_data
    )


# --------------------------------
# GET ALL VEHICLES
# All authenticated users
# --------------------------------

@router.get(
    "/",
    response_model=list[VehicleOut]
)
def get_vehicles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Driver: return only their assigned vehicle
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        driver_profile = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver_profile:
            return []
        assigned = [
            v for v in get_all_vehicles(db)
            if str(v.vehicle_id) in [
                str(veh.vehicle_id) for veh in
                (driver_profile.vehicles or [])
            ]
        ]
        return assigned

    return get_all_vehicles(db)


# --------------------------------
# GET VEHICLE BY ID
# All authenticated users
# --------------------------------

@router.get(
    "/{vehicle_id}",
    response_model=VehicleOut
)
def get_vehicle(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    vehicle = get_vehicle_by_id(
        db,
        vehicle_id
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    return vehicle


# --------------------------------
# UPDATE VEHICLE
# Admin / Fleet Manager only
# --------------------------------

@router.put(
    "/{vehicle_id}",
    response_model=VehicleOut
)
def update_vehicle_api(
    vehicle_id: UUID,
    vehicle_data: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if current_user.role not in [
        RoleEnum.Admin,
        RoleEnum.FleetManager,
    ]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin or Fleet Manager can update vehicles",
        )

    vehicle = get_vehicle_by_id(
        db,
        vehicle_id
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    old_driver_id = str(vehicle.driver_id) if vehicle.driver_id else None
    
    updated_vehicle = update_vehicle(
        db,
        vehicle,
        vehicle_data
    )
    
    new_driver_id = str(updated_vehicle.driver_id) if updated_vehicle.driver_id else None
    
    if new_driver_id and new_driver_id != old_driver_id:
        notify_driver(
            db,
            driver_id=updated_vehicle.driver_id,
            title="Vehicle Assigned",
            message=f"You have been assigned to vehicle {updated_vehicle.registration_number}.",
            alert_type="INFO"
        )
            
    return updated_vehicle


# --------------------------------
# DELETE VEHICLE
# Admin / Fleet Manager only
# --------------------------------

@router.delete(
    "/{vehicle_id}"
)
def delete_vehicle_api(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if current_user.role not in [
        RoleEnum.Admin,
    ]:
        raise HTTPException(
            status_code=403,
            detail="Only Admin can delete vehicles",
        )

    vehicle = get_vehicle_by_id(
        db,
        vehicle_id
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    delete_vehicle(
        db,
        vehicle
    )

    return {
        "message": "Vehicle deleted successfully"
    }