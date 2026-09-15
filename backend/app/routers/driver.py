from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db

from app.schemas.driver import (
    DriverCreate,
    DriverUpdate,
    DriverOut,
)

from app.crud.driver import (
    create_driver,
    get_drivers,
    get_driver,
    update_driver,
    delete_driver,
)

from app.core.deps import get_current_user, require_roles

from app.models.user import User, RoleEnum


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/drivers",
    tags=["Drivers"],
)


# ============================================================
# CREATE DRIVER
# ============================================================

@router.post(
    "/",
    response_model=DriverOut,
    status_code=201,
)
def create_driver_api(

    driver_in: DriverCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
        )
    ),
):

    try:
        return create_driver(
            db=db,
            user_id=driver_in.user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# GET ALL DRIVERS
# ============================================================

@router.get(
    "/",
    response_model=list[DriverOut],
)
def get_drivers_api(

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):
    # Driver: show only their own profile
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        from app.models.driver import Driver as DriverModel
        driver = (
            db.query(DriverModel)
            .filter(DriverModel.user_id == current_user.user_id)
            .first()
        )
        if not driver:
            return []
        drivers = [driver]
    else:
        drivers = get_drivers(db)

    result = []

    for driver in drivers:

        # ----------------------------------------------------
        # USER
        # ----------------------------------------------------

        user = driver.user

        # ----------------------------------------------------
        # VEHICLE
        # ----------------------------------------------------

        vehicle = (
            driver.vehicles[0]
            if driver.vehicles
            else None
        )

        result.append({

            "driver_id": driver.driver_id,

            "user_id": driver.user_id,

            "full_name": (
                user.full_name
                if user
                else None
            ),

            "email": (
                user.email
                if user
                else None
            ),

            "phone": (
                user.phone
                if user
                else None
            ),

            "vehicle_id": (
                vehicle.vehicle_id
                if vehicle
                else None
            ),

            "registration_number": (
                vehicle.registration_number
                if vehicle
                else None
            ),

            "vehicle_status": (
                vehicle.status
                if vehicle
                else None
            ),
        })

    return result


# ============================================================
# GET ONE DRIVER
# ============================================================

@router.get(
    "/{driver_id}",
    response_model=DriverOut,
)
def get_driver_api(

    driver_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        from app.models.driver import Driver as DriverModel
        drv = (
            db.query(DriverModel)
            .filter(DriverModel.user_id == current_user.user_id)
            .first()
        )
        if not drv or str(drv.driver_id) != str(driver_id):
            raise HTTPException(status_code=403, detail="You can only view your own profile")

    driver = get_driver(
        db,
        driver_id,
    )

    if not driver:

        raise HTTPException(
            status_code=404,
            detail="Driver not found",
        )

    user = driver.user

    vehicle = (
        driver.vehicles[0]
        if driver.vehicles
        else None
    )

    return {

        "driver_id": driver.driver_id,

        "user_id": driver.user_id,

        "full_name": (
            user.full_name
            if user
            else None
        ),

        "email": (
            user.email
            if user
            else None
        ),

        "phone": (
            user.phone
            if user
            else None
        ),

        "vehicle_id": (
            vehicle.vehicle_id
            if vehicle
            else None
        ),

        "registration_number": (
            vehicle.registration_number
            if vehicle
            else None
        ),

        "vehicle_status": (
            vehicle.status
            if vehicle
            else None
        ),
    }


# ============================================================
# UPDATE DRIVER
# ============================================================

@router.put(
    "/{driver_id}",
    response_model=DriverOut,
)
def update_driver_api(

    driver_id: UUID,

    driver_in: DriverUpdate,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
        )
    ),
):

    # --------------------------------------------------------
    # Find driver
    # --------------------------------------------------------

    driver = get_driver(
        db,
        driver_id,
    )

    if not driver:

        raise HTTPException(
            status_code=404,
            detail="Driver not found",
        )

    # --------------------------------------------------------
    # Update driver safely
    # --------------------------------------------------------

    try:

        update_driver(
            db=db,
            driver=driver,
            user_id=driver_in.user_id,
        )

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="User is already assigned to another driver",
        )

    # --------------------------------------------------------
    # Refresh driver
    # --------------------------------------------------------

    driver = get_driver(
        db,
        driver_id,
    )

    user = driver.user

    vehicle = (
        driver.vehicles[0]
        if driver.vehicles
        else None
    )

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {

        "driver_id": driver.driver_id,

        "user_id": driver.user_id,

        "full_name": (
            user.full_name
            if user
            else None
        ),

        "email": (
            user.email
            if user
            else None
        ),

        "phone": (
            user.phone
            if user
            else None
        ),

        "vehicle_id": (
            vehicle.vehicle_id
            if vehicle
            else None
        ),

        "registration_number": (
            vehicle.registration_number
            if vehicle
            else None
        ),

        "vehicle_status": (
            vehicle.status
            if vehicle
            else None
        ),
    }


# ============================================================
# DELETE DRIVER
# ============================================================

@router.delete(
    "/{driver_id}",
)
def delete_driver_api(

    driver_id: UUID,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(RoleEnum.Admin)
    ),
):

    driver = get_driver(
        db,
        driver_id,
    )

    if not driver:

        raise HTTPException(
            status_code=404,
            detail="Driver not found",
        )

    try:
        delete_driver(
            db,
            driver,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete this driver because they are currently assigned to one or more shipments or vehicles. Please unassign them first.",
        )

    return {
        "message": "Driver deleted successfully",
    }