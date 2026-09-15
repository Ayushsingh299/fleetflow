from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth
from app.routers import user
from app.routers import vehicle
from app.routers import driver
from app.routers import shipment
from app.routers import trip
from app.routers import route
from app.routers import maintenance
from app.routers import fuel
from app.routers import notification
from app.routers import attendance
from app.routers import websocket
from app.routers import analytics


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="FleetFlow API",
    version="0.1.0",
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Vite development servers
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",

        # 127.0.0.1 equivalents
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTHENTICATION ROUTER
# ============================================================

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# USERS ROUTER
# ============================================================

app.include_router(
    user.router
)


# ============================================================
# VEHICLE ROUTER
# ============================================================

app.include_router(
    vehicle.router
)


# ============================================================
# DRIVER ROUTER
# ============================================================

app.include_router(
    driver.router
)


# ============================================================
# SHIPMENT ROUTER
# ============================================================

app.include_router(
    shipment.router
)


# ============================================================
# TRIP ROUTER
# ============================================================

app.include_router(
    trip.router
)


# ============================================================
# ROUTE OPTIMIZATION ROUTER
# ============================================================

app.include_router(
    route.router
)


# ============================================================
# MAINTENANCE ROUTER
# ============================================================

app.include_router(
    maintenance.router
)


# ============================================================
# FUEL RECORDS ROUTER
# ============================================================

app.include_router(
    fuel.router
)


# ============================================================
# NOTIFICATIONS ROUTER
# ============================================================

app.include_router(
    notification.router
)


# ============================================================
# ATTENDANCE ROUTER
# ============================================================

app.include_router(
    attendance.router
)


# ============================================================
# WEBSOCKET ROUTER
# ============================================================

app.include_router(
    websocket.router
)


# ============================================================
# ANALYTICS ROUTER
# ============================================================

app.include_router(
    analytics.router
)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "FleetFlow API running"
    }