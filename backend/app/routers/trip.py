from uuid import UUID
from datetime import datetime
import json
from app.services.routing import get_route, geocode_address

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.trip import Trip, TripStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.driver import Driver
from app.models.shipment import Shipment, ShipmentStatus
from app.models.user import RoleEnum
from app.core.deps import get_current_user, require_roles
from app.crud.notification import notify_admins_and_managers, notify_dispatchers, notify_driver


router = APIRouter(
    prefix="/trips",
    tags=["Trips"],
)


# =========================================================
# SCHEMAS
# =========================================================

class TripCreate(BaseModel):
    vehicle_id: UUID
    driver_id: UUID
    shipment_id: UUID

    start_location: str
    destination: str

    start_time: datetime | None = None
    end_time: datetime | None = None

    distance: float | None = None

    route_type: str | None = "Fastest"


class TripUpdate(BaseModel):
    vehicle_id: UUID | None = None
    driver_id: UUID | None = None
    shipment_id: UUID | None = None

    start_location: str | None = None
    destination: str | None = None

    start_time: datetime | None = None
    end_time: datetime | None = None

    distance: float | None = None
    status: str | None = None
    route_type: str | None = None


class TripOut(BaseModel):
    trip_id: UUID

    vehicle_id: UUID
    driver_id: UUID
    shipment_id: UUID

    start_location: str | None
    destination: str | None

    start_time: datetime | None
    end_time: datetime | None

    distance: float | None
    status: str | None
    route_type: str | None
    estimated_duration: str | None = None
    route_geometry: str | None = None

    class Config:
        from_attributes = True



# =========================================================
# GET ALL TRIPS
# =========================================================

@router.get(
    "/",
    response_model=list[TripOut],
)
def get_trips(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Admin/FM/Dispatcher: all trips.
    Driver: only trips assigned to their driver profile.
    """
    is_driver = (
        current_user.role == RoleEnum.Driver
        or str(current_user.role) == "Driver"
    )

    if is_driver:
        driver_profile = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver_profile:
            return []
        return (
            db.query(Trip)
            .filter(Trip.driver_id == driver_profile.driver_id)
            .all()
        )

    return (
        db.query(Trip)
        .filter(
            Trip.vehicle_id.is_not(None),
            Trip.driver_id.is_not(None),
            Trip.shipment_id.is_not(None),
        )
        .all()
    )


# =========================================================
# CREATE TRIP
# =========================================================

@router.post(
    "/",
    response_model=TripOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_trip(
    trip_data: TripCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    # -----------------------------------------------------
    # Check vehicle
    # -----------------------------------------------------

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == trip_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    # -----------------------------------------------------
    # Check driver
    # -----------------------------------------------------

    driver = (
        db.query(Driver)
        .filter(
            Driver.driver_id == trip_data.driver_id
        )
        .first()
    )

    if not driver:
        raise HTTPException(
            status_code=404,
            detail="Driver not found",
        )

    # -----------------------------------------------------
    # Check shipment
    # -----------------------------------------------------

    shipment = (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id
            == trip_data.shipment_id
        )
        .first()
    )

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail="Shipment not found",
        )

    # -----------------------------------------------------
    # Generate Route
    # -----------------------------------------------------
    final_distance = trip_data.distance
    route_geometry_str = None
    est_duration_str = None
    
    try:
        s_lat, s_lon = await geocode_address(trip_data.start_location)
        d_lat, d_lon = await geocode_address(trip_data.destination)
        
        route_res = await get_route(s_lat, s_lon, d_lat, d_lon, route_type=trip_data.route_type or "Fastest")
        
        final_distance = route_res.get("distance_meters", final_distance)
        route_geometry_str = json.dumps(route_res.get("geometry"))
        est_duration_str = route_res.get("formatted_duration")
    except Exception as e:
        print(f"Routing failed: {e}")

    # -----------------------------------------------------
    # Create trip
    # -----------------------------------------------------

    trip = Trip(
        vehicle_id=trip_data.vehicle_id,
        driver_id=trip_data.driver_id,
        shipment_id=trip_data.shipment_id,

        start_location=trip_data.start_location,
        destination=trip_data.destination,

        start_time=trip_data.start_time,
        end_time=trip_data.end_time,

        distance=final_distance,

        route_type=trip_data.route_type or "Fastest",
        route_geometry=route_geometry_str,
        estimated_duration=est_duration_str,

        status="Scheduled",
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)

    broadcast_notification(
        db,
        title="New Trip Assigned",
        message=f"Trip {trip.trip_id} has been scheduled for vehicle {vehicle.registration_number}.",
        alert_type="INFO",
        roles=[RoleEnum.Admin, RoleEnum.FleetManager, RoleEnum.Dispatcher]
    )
    if driver and driver.user_id:
        create_notification(
            db,
            user_id=driver.user_id,
            title="Trip Assigned",
            message=f"You have been assigned to trip {trip.trip_id}.",
            alert_type="INFO"
        )

    return trip


# =========================================================
# GET SINGLE TRIP
# =========================================================

@router.get(
    "/{trip_id}",
    response_model=TripOut,
)
def get_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    trip = (
        db.query(Trip)
        .filter(
            Trip.trip_id == trip_id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    return trip


# =========================================================
# UPDATE TRIP
# =========================================================

@router.put(
    "/{trip_id}",
    response_model=TripOut,
)
def update_trip(
    trip_id: UUID,
    trip_data: TripUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # Find trip
    # -----------------------------------------------------

    trip = (
        db.query(Trip)
        .filter(
            Trip.trip_id == trip_id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    update_data = trip_data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------------------
    # Validate vehicle if being changed
    # -----------------------------------------------------

    if "vehicle_id" in update_data:
        vehicle = (
            db.query(Vehicle)
            .filter(
                Vehicle.vehicle_id
                == update_data["vehicle_id"]
            )
            .first()
        )

        if not vehicle:
            raise HTTPException(
                status_code=404,
                detail="Vehicle not found",
            )

    # -----------------------------------------------------
    # Validate driver if being changed
    # -----------------------------------------------------

    if "driver_id" in update_data:
        driver = (
            db.query(Driver)
            .filter(
                Driver.driver_id
                == update_data["driver_id"]
            )
            .first()
        )

        if not driver:
            raise HTTPException(
                status_code=404,
                detail="Driver not found",
            )

    # -----------------------------------------------------
    # Validate shipment if being changed
    # -----------------------------------------------------

    if "shipment_id" in update_data:
        shipment = (
            db.query(Shipment)
            .filter(
                Shipment.shipment_id
                == update_data["shipment_id"]
            )
            .first()
        )

        if not shipment:
            raise HTTPException(
                status_code=404,
                detail="Shipment not found",
            )

    # -----------------------------------------------------
    # Validate distance
    # -----------------------------------------------------

    if "distance" in update_data:
        distance = update_data["distance"]

        if distance is not None and distance < 0:
            raise HTTPException(
                status_code=400,
                detail="Distance cannot be negative",
            )

    # -----------------------------------------------------
    # Update fields
    # -----------------------------------------------------

    for field, value in update_data.items():
        setattr(
            trip,
            field,
            value,
        )

    db.commit()
    db.refresh(trip)

    return trip


# =========================================================
# DELETE TRIP
# =========================================================

@router.delete(
    "/{trip_id}",
)
def delete_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.Admin)),
):
    # -----------------------------------------------------
    # Find trip
    # -----------------------------------------------------

    trip = (
        db.query(Trip)
        .filter(
            Trip.trip_id == trip_id
        )
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    # -----------------------------------------------------
    # Delete
    # -----------------------------------------------------

    db.delete(trip)
    db.commit()

    return {
        "message": "Trip deleted successfully"
    }


# =========================================================
# START TRIP
# Sets status → In Transit, locks vehicle and driver
# =========================================================

@router.post(
    "/{trip_id}/start",
    response_model=TripOut,
)
def start_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.Admin, RoleEnum.FleetManager, RoleEnum.Driver)),
):
    trip = (
        db.query(Trip)
        .filter(Trip.trip_id == trip_id)
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    # Driver can only start their own trip
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        driver_profile = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver_profile or str(trip.driver_id) != str(driver_profile.driver_id):
            raise HTTPException(
                status_code=403,
                detail="You can only start your own trips",
            )

    if trip.status not in ["Scheduled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot start a trip with status '{trip.status}'",
        )

    # Mark trip as In Progress
    trip.status = TripStatus.In_Progress
    trip.start_time = datetime.utcnow()

    # Lock vehicle
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == trip.vehicle_id)
        .first()
    )
    if vehicle:
        vehicle.status = "In Transit"

    # Lock driver
    driver = (
        db.query(Driver)
        .filter(Driver.driver_id == trip.driver_id)
        .first()
    )
    if driver:
        driver.status = "On Trip"

    # Update shipment to In Transit
    shipment = (
        db.query(Shipment)
        .filter(Shipment.shipment_id == trip.shipment_id)
        .first()
    )
    if shipment:
        shipment.status = ShipmentStatus.In_Transit

    db.commit()
    db.refresh(trip)

    return trip


# =========================================================
# END TRIP
# Records end time, marks shipment Delivered, frees vehicle/driver
# =========================================================

@router.post(
    "/{trip_id}/end",
    response_model=TripOut,
)
def end_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.Admin, RoleEnum.FleetManager, RoleEnum.Driver)),
):
    trip = (
        db.query(Trip)
        .filter(Trip.trip_id == trip_id)
        .first()
    )

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found",
        )

    # Driver can only end their own trip
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        driver_profile = (
            db.query(Driver)
            .filter(Driver.user_id == current_user.user_id)
            .first()
        )
        if not driver_profile or str(trip.driver_id) != str(driver_profile.driver_id):
            raise HTTPException(
                status_code=403,
                detail="You can only end your own trips",
            )

    if trip.status not in [TripStatus.In_Progress, "In Progress"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot end a trip with status '{trip.status}'",
        )

    # Mark trip Completed
    trip.status = TripStatus.Completed
    trip.end_time = datetime.utcnow()

    # Free vehicle
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == trip.vehicle_id)
        .first()
    )
    if vehicle:
        vehicle.status = "Available"

    # Free driver
    driver = (
        db.query(Driver)
        .filter(Driver.driver_id == trip.driver_id)
        .first()
    )
    if driver:
        driver.status = "Available"

    # Mark shipment Delivered
    shipment = (
        db.query(Shipment)
        .filter(Shipment.shipment_id == trip.shipment_id)
        .first()
    )
    if shipment:
        shipment.status = ShipmentStatus.Delivered

    db.commit()
    db.refresh(trip)
    
    if shipment:
        title = "Shipment Delivered"
        msg = f"Shipment {shipment.tracking_number} has been delivered successfully."
        notify_admins_and_managers(db, title, msg, "SUCCESS")
        notify_dispatchers(db, title, msg, "SUCCESS")

    return trip


# =========================================================
# RECALCULATE ROUTE
# =========================================================

class RecalculateRequest(BaseModel):
    current_lat: float
    current_lon: float

@router.post(
    "/{trip_id}/recalculate",
    response_model=TripOut,
)
async def recalculate_route(
    trip_id: UUID,
    req: RecalculateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    try:
        d_lat, d_lon = await geocode_address(trip.destination)
        route_res = await get_route(
            req.current_lat, req.current_lon, 
            d_lat, d_lon, 
            route_type=trip.route_type or "Fastest"
        )
        
        trip.distance = route_res.get("distance_meters")
        trip.route_geometry = json.dumps(route_res.get("geometry"))
        db.commit()
        db.refresh(trip)
        
        # Notify Dispatcher and Driver
        title = "Route Recalculated"
        msg = f"The route for trip {trip.trip_id} has been recalculated."
        notify_admins_and_managers(db, title, msg, "INFO")
        notify_dispatchers(db, title, msg, "INFO")
        
        if trip.driver_id:
            notify_driver(db, trip.driver_id, title, "Your current trip route has been recalculated.", "INFO")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return trip