"""Quick audit script - run with: python audit.py"""
from app.main import app

routes = []
for route in app.router.routes:
    if hasattr(route, "path") and hasattr(route, "methods"):
        for m in (route.methods or ["WS"]):
            routes.append((m, route.path))
    elif hasattr(route, "routes"):
        for sub in route.routes:
            if hasattr(sub, "path") and hasattr(sub, "methods"):
                for m in (sub.methods or ["WS"]):
                    routes.append((m, sub.path))

routes.sort(key=lambda x: x[1])
for m, p in routes:
    print(f"{m:8} {p}")

print(f"\nTotal endpoints: {len(routes)}")

# Gap checks against milestone spec
REQUIRED = [
    # M1 Auth
    ("POST", "/auth/signup"),
    ("POST", "/auth/login"),
    ("GET",  "/auth/me"),
    # M1 Users
    ("GET",  "/users/"),
    ("GET",  "/users/me"),
    ("PUT",  "/users/me"),
    ("PUT",  "/users/{user_id}/role"),
    ("DELETE", "/users/{user_id}"),
    # M1 Vehicles
    ("POST", "/vehicles/"),
    ("GET",  "/vehicles/"),
    ("GET",  "/vehicles/{vehicle_id}"),
    ("PUT",  "/vehicles/{vehicle_id}"),
    ("DELETE", "/vehicles/{vehicle_id}"),
    # M2 Shipments
    ("POST", "/shipments/"),
    ("GET",  "/shipments/"),
    ("GET",  "/shipments/{shipment_id}"),
    ("PUT",  "/shipments/{shipment_id}"),
    ("DELETE", "/shipments/{shipment_id}"),
    # M2 Trips
    ("POST", "/trips/"),
    ("GET",  "/trips/"),
    ("GET",  "/trips/{trip_id}"),
    ("PUT",  "/trips/{trip_id}"),
    ("DELETE", "/trips/{trip_id}"),
    ("POST", "/trips/{trip_id}/start"),
    ("POST", "/trips/{trip_id}/end"),
    # M2 GPS / WebSocket
    ("GET",  "/ws/"),
    # M2 Drivers
    ("POST", "/drivers/"),
    ("GET",  "/drivers/"),
    ("GET",  "/drivers/{driver_id}"),
    ("PUT",  "/drivers/{driver_id}"),
    ("DELETE", "/drivers/{driver_id}"),
    # M3 Maintenance
    ("POST", "/maintenance/"),
    ("GET",  "/maintenance/"),
    ("GET",  "/maintenance/alerts"),
    ("GET",  "/maintenance/{maintenance_id}"),
    ("PUT",  "/maintenance/{maintenance_id}"),
    ("DELETE", "/maintenance/{maintenance_id}"),
    # M3 Fuel
    ("POST", "/fuel/"),
    ("GET",  "/fuel/"),
    ("GET",  "/fuel/efficiency/summary"),
    ("GET",  "/fuel/{fuel_id}"),
    ("DELETE", "/fuel/{fuel_id}"),
    # M3 Notifications
    ("GET",  "/notifications/"),
    # M3 Attendance
    ("POST", "/attendance/"),
    ("GET",  "/attendance/"),
    # M3 Analytics
    ("GET",  "/analytics/summary"),
    ("GET",  "/analytics/driver-performance"),
    ("GET",  "/analytics/fuel-trends"),
    ("GET",  "/analytics/maintenance-costs"),
    ("GET",  "/analytics/shipment-alerts"),
]

actual = set(routes)
print("\n=== MISSING ROUTES ===")
missing = []
for method, path in REQUIRED:
    if (method, path) not in actual:
        print(f"  MISSING: {method} {path}")
        missing.append((method, path))

if not missing:
    print("  None - all required routes present!")
