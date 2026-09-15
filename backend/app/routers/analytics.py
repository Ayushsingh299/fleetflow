from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.database import get_db
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.shipment import Shipment
from app.models.trip import Trip
from app.models.fuel_record import FuelRecord
from app.models.maintenance import VehicleMaintenance
from app.models.attendance import Attendance
from app.models.user import User
from app.core.deps import get_current_user, require_roles
from app.models.user import RoleEnum
from app.services.export import export_to_pdf, export_to_excel

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


# ============================================================
# FLEET SUMMARY
# ============================================================

@router.get(
    "/summary",
)
def get_fleet_analytics_summary(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
        )
    ),
):
    # Fleet Vehicles
    total_vehicles = db.query(func.count(Vehicle.vehicle_id)).scalar() or 0
    available_vehicles = db.query(func.count(Vehicle.vehicle_id)).filter(Vehicle.status == "Available").scalar() or 0
    assigned_vehicles = db.query(func.count(Vehicle.vehicle_id)).filter(Vehicle.status == "Assigned").scalar() or 0
    in_transit_vehicles = db.query(func.count(Vehicle.vehicle_id)).filter(Vehicle.status == "In Transit").scalar() or 0
    maintenance_vehicles = db.query(func.count(Vehicle.vehicle_id)).filter(Vehicle.status == "Maintenance").scalar() or 0

    utilization_rate = round(((in_transit_vehicles + assigned_vehicles) / total_vehicles * 100), 1) if total_vehicles > 0 else 0.0

    # Drivers
    total_drivers = db.query(func.count(Driver.driver_id)).scalar() or 0

    # We won't filter vehicles/drivers by date as they are entities, but we'll filter shipments, trips, fuel, maintenance.
    # Shipments
    shipments_query = db.query(Shipment)
    if start_date:
        shipments_query = shipments_query.filter(Shipment.created_at >= start_date)
    if end_date:
        shipments_query = shipments_query.filter(Shipment.created_at <= end_date)
    
    total_shipments = shipments_query.count()
    delivered_shipments = shipments_query.filter(Shipment.status == "Delivered").count()
    in_transit_shipments = shipments_query.filter(Shipment.status == "In Transit").count()
    delayed_shipments = shipments_query.filter(Shipment.status == "Delayed").count()
    on_time_rate = round((delivered_shipments / total_shipments * 100), 1) if total_shipments > 0 else 100.0

    # Trips & Distances
    trips_query = db.query(Trip)
    if start_date:
        trips_query = trips_query.filter(Trip.start_time >= start_date)
    if end_date:
        trips_query = trips_query.filter(Trip.end_time <= end_date)
        
    total_trips = trips_query.count()
    total_distance_meters = trips_query.with_entities(func.sum(Trip.distance)).scalar() or 0.0
    total_distance_km = round(total_distance_meters / 1000.0, 1)

    # Costs
    fuel_query = db.query(FuelRecord)
    if start_date:
        fuel_query = fuel_query.filter(FuelRecord.date >= start_date.date())
    if end_date:
        fuel_query = fuel_query.filter(FuelRecord.date <= end_date.date())
    total_fuel_cost = fuel_query.with_entities(func.sum(FuelRecord.fuel_cost)).scalar() or 0.0

    maint_query = db.query(VehicleMaintenance)
    if start_date:
        maint_query = maint_query.filter(VehicleMaintenance.service_date >= start_date)
    if end_date:
        maint_query = maint_query.filter(VehicleMaintenance.service_date <= end_date)
    total_maintenance_cost = maint_query.with_entities(func.sum(VehicleMaintenance.cost)).scalar() or 0.0

    return {
        "fleet": {
            "total_vehicles": total_vehicles,
            "available": available_vehicles,
            "assigned": assigned_vehicles,
            "in_transit": in_transit_vehicles,
            "maintenance": maintenance_vehicles,
            "utilization_rate_pct": utilization_rate,
        },
        "drivers": {
            "total_drivers": total_drivers,
        },
        "shipments": {
            "total": total_shipments,
            "delivered": delivered_shipments,
            "in_transit": in_transit_shipments,
            "delayed": delayed_shipments,
            "on_time_rate_pct": on_time_rate,
        },
        "operations": {
            "total_trips": total_trips,
            "total_distance_km": total_distance_km,
            "total_fuel_cost": round(total_fuel_cost, 2),
            "total_maintenance_cost": round(total_maintenance_cost, 2),
            "total_operating_cost": round(total_fuel_cost + total_maintenance_cost, 2),
        }
    }


# ============================================================
# DRIVER PERFORMANCE
# ============================================================

@router.get(
    "/driver-performance",
)
def get_driver_performance(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
        )
    ),
):
    """
    Returns per-driver metrics:
    - trips completed
    - total distance driven
    - on-time delivery rate (completed trips / all their trips)
    """
    drivers = db.query(Driver).all()
    result = []

    for driver in drivers:
        # All trips for this driver
        trips_query = db.query(Trip).filter(Trip.driver_id == driver.driver_id)
        
        if start_date:
            trips_query = trips_query.filter(Trip.start_time >= start_date)
        if end_date:
            trips_query = trips_query.filter(Trip.end_time <= end_date)
            
        all_trips = trips_query.all()

        total_trips = len(all_trips)
        completed_trips = sum(1 for t in all_trips if t.status == "Completed")
        total_distance = sum((t.distance or 0) for t in all_trips) / 1000.0  # km

        on_time_rate = round((completed_trips / total_trips) * 100, 1) if total_trips > 0 else 0.0

        # Attendance Rate
        attendance_query = db.query(Attendance).filter(Attendance.driver_id == driver.driver_id)
        if start_date:
            attendance_query = attendance_query.filter(Attendance.date >= start_date.date())
        if end_date:
            attendance_query = attendance_query.filter(Attendance.date <= end_date.date())
            
        attendances = attendance_query.all()
        total_days = len(attendances)
        present_days = sum(1 for a in attendances if a.status == "Present")
        attendance_rate = round((present_days / total_days) * 100, 1) if total_days > 0 else 0.0

        # Get user name via relationship
        user = driver.user
        full_name = user.full_name if user else str(driver.driver_id)[:8]

        result.append({
            "driver_id": str(driver.driver_id),
            "full_name": full_name,
            "status": driver.status,
            "total_trips": total_trips,
            "completed_trips": completed_trips,
            "total_distance_km": round(total_distance, 1),
            "completion_rate_pct": on_time_rate,
            "attendance_rate_pct": attendance_rate,
        })

    # Sort by completed trips descending
    result.sort(key=lambda x: x["completed_trips"], reverse=True)

    return {
        "total_drivers": len(result),
        "drivers": result,
    }


# ============================================================
# FUEL TRENDS
# ============================================================

@router.get(
    "/fuel-trends",
)
def get_fuel_trends(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
        )
    ),
):
    """
    Returns fuel cost and consumption per vehicle.
    """
    vehicles = db.query(Vehicle).all()
    result = []

    for vehicle in vehicles:
        records_query = db.query(FuelRecord).filter(FuelRecord.vehicle_id == vehicle.vehicle_id)
        if start_date:
            records_query = records_query.filter(FuelRecord.date >= start_date.date())
        if end_date:
            records_query = records_query.filter(FuelRecord.date <= end_date.date())
        records = records_query.all()

        total_fuel = sum(r.fuel_amount or 0 for r in records)
        total_cost = sum(r.fuel_cost or 0 for r in records)

        # Distance from trips for this vehicle (in km)
        trips_query = db.query(Trip).filter(Trip.vehicle_id == vehicle.vehicle_id, Trip.status == "Completed")
        if start_date:
            trips_query = trips_query.filter(Trip.start_time >= start_date)
        if end_date:
            trips_query = trips_query.filter(Trip.end_time <= end_date)
        trips = trips_query.all()
        total_distance_km = sum((t.distance or 0) for t in trips) / 1000.0

        efficiency = round(total_distance_km / total_fuel, 2) if total_fuel > 0 else 0.0

        result.append({
            "vehicle_id": str(vehicle.vehicle_id),
            "registration_number": vehicle.registration_number,
            "vehicle_type": vehicle.vehicle_type,
            "total_fuel_liters": round(total_fuel, 2),
            "total_fuel_cost": round(total_cost, 2),
            "total_distance_km": round(total_distance_km, 2),
            "km_per_liter": efficiency,
            "refill_count": len(records),
        })

    # Sort by cost descending
    result.sort(key=lambda x: x["total_fuel_cost"], reverse=True)

    return {
        "total_vehicles": len(result),
        "vehicles": result,
    }


# ============================================================
# MAINTENANCE COSTS
# ============================================================

@router.get(
    "/maintenance-costs",
)
def get_maintenance_costs(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    """
    Returns maintenance cost breakdown:
    - By maintenance type (total cost per type)
    - Per vehicle (total cost per vehicle)
    """
    records_query = db.query(VehicleMaintenance)
    if start_date:
        records_query = records_query.filter(VehicleMaintenance.service_date >= start_date)
    if end_date:
        records_query = records_query.filter(VehicleMaintenance.service_date <= end_date)
    records = records_query.all()

    # By type
    by_type: dict = {}
    by_vehicle: dict = {}

    for record in records:
        m_type = record.maintenance_type or "General Inspection"
        cost = record.cost or 0.0

        # Aggregate by type
        if m_type not in by_type:
            by_type[m_type] = {"maintenance_type": m_type, "total_cost": 0.0, "count": 0}
        by_type[m_type]["total_cost"] += cost
        by_type[m_type]["count"] += 1

        # Aggregate by vehicle
        v_id = str(record.vehicle_id) if record.vehicle_id else "unassigned"
        if v_id not in by_vehicle:
            # Get vehicle registration
            if record.vehicle_id:
                vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == record.vehicle_id).first()
                reg = vehicle.registration_number if vehicle else v_id[:8]
            else:
                reg = "Unassigned"
            by_vehicle[v_id] = {
                "vehicle_id": v_id,
                "registration_number": reg,
                "total_cost": 0.0,
                "record_count": 0,
            }
        by_vehicle[v_id]["total_cost"] += cost
        by_vehicle[v_id]["record_count"] += 1

    type_list = sorted(by_type.values(), key=lambda x: x["total_cost"], reverse=True)
    vehicle_list = sorted(by_vehicle.values(), key=lambda x: x["total_cost"], reverse=True)

    total_cost = sum(r.cost or 0 for r in records)

    return {
        "total_maintenance_cost": round(total_cost, 2),
        "total_records": len(records),
        "by_type": type_list,
        "by_vehicle": vehicle_list,
    }


# ============================================================
# SHIPMENT ALERTS (Delayed)
# ============================================================

@router.get(
    "/shipment-alerts",
)
def get_shipment_alerts(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    """
    Returns all delayed shipments as an alert list.
    """
    delayed = (
        db.query(Shipment)
        .filter(Shipment.status == "Delayed")
        .all()
    )

    result = []
    for s in delayed:
        result.append({
            "shipment_id": str(s.shipment_id),
            "tracking_number": s.tracking_number,
            "source": s.source,
            "destination": s.destination,
            "customer_name": s.customer_name,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status),
            "alert": "Shipment is delayed",
        })

    return {
        "total_delayed": len(result),
        "delayed_shipments": result,
    }


# ============================================================
# EXPORT
# ============================================================

@router.get("/export/driver-performance/pdf")
def export_driver_performance_pdf(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = get_driver_performance(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["drivers"]
    return export_to_pdf(data, "driver_performance", "Driver Performance Report")

@router.get("/export/driver-performance/excel")
def export_driver_performance_excel(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = get_driver_performance(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["drivers"]
    return export_to_excel(data, "driver_performance")

@router.get("/export/fuel-trends/pdf")
def export_fuel_trends_pdf(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = get_fuel_trends(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["vehicles"]
    return export_to_pdf(data, "fuel_trends", "Fuel Trends Report")

@router.get("/export/fuel-trends/excel")
def export_fuel_trends_excel(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = get_fuel_trends(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["vehicles"]
    return export_to_excel(data, "fuel_trends")

@router.get("/export/maintenance-costs/pdf")
def export_maintenance_costs_pdf(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = get_maintenance_costs(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["by_vehicle"]
    return export_to_pdf(data, "maintenance_costs", "Maintenance Costs by Vehicle")

@router.get("/export/maintenance-costs/excel")
def export_maintenance_costs_excel(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = get_maintenance_costs(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["by_vehicle"]
    return export_to_excel(data, "maintenance_costs")

@router.get("/export/fleet-summary/pdf")
def export_fleet_summary_pdf(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
        )
    ),
):
    data = [get_fleet_analytics_summary(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["fleet"]]
    return export_to_pdf(data, "fleet_summary", "Fleet Utilization Report")

@router.get("/export/fleet-summary/excel")
def export_fleet_summary_excel(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
        )
    ),
):
    data = [get_fleet_analytics_summary(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["fleet"]]
    return export_to_excel(data, "fleet_summary")

@router.get("/export/delivery-performance/pdf")
def export_delivery_performance_pdf(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = [get_fleet_analytics_summary(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["shipments"]]
    return export_to_pdf(data, "delivery_performance", "Delivery Performance Report")

@router.get("/export/delivery-performance/excel")
def export_delivery_performance_excel(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(
            RoleEnum.Admin,
            RoleEnum.FleetManager,
            RoleEnum.Dispatcher,
        )
    ),
):
    data = [get_fleet_analytics_summary(start_date=start_date, end_date=end_date, db=db, current_user=current_user)["shipments"]]
    return export_to_excel(data, "delivery_performance")

