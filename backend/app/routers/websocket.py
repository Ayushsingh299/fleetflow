import math
import json
import asyncio
import os
from datetime import datetime

import redis.asyncio as redis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.database import get_db
from app.models.gps_tracking import GPSTracking
from app.services.routing import format_duration

load_dotenv()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

router = APIRouter(
    prefix="/ws",
    tags=["GPS Tracking"],
)


# ============================================================
# CONNECTION MANAGER (Redis Pub/Sub)
# ============================================================

class ConnectionManager:

    def __init__(self):
        # vehicle_id -> list of connected WebSockets
        self.active_connections = {}
        self.redis = redis.from_url(REDIS_URL)

    async def connect(self, websocket: WebSocket, vehicle_id: str):
        await websocket.accept()

        is_new_vehicle = False
        if vehicle_id not in self.active_connections:
            self.active_connections[vehicle_id] = []
            is_new_vehicle = True

        self.active_connections[vehicle_id].append(websocket)
        
        if is_new_vehicle:
            asyncio.create_task(self._listen_to_redis(vehicle_id))

        print(
            f"WebSocket connected: vehicle={vehicle_id}. "
            f"Active connections: {len(self.active_connections[vehicle_id])}"
        )

    def disconnect(self, websocket: WebSocket, vehicle_id: str):
        if vehicle_id in self.active_connections:
            if websocket in self.active_connections[vehicle_id]:
                self.active_connections[vehicle_id].remove(websocket)
            
            if not self.active_connections[vehicle_id]:
                del self.active_connections[vehicle_id]

        print(f"WebSocket disconnected: vehicle={vehicle_id}")

    async def _listen_to_redis(self, vehicle_id: str):
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(f"tracking:{vehicle_id}")
        print(f"Subscribed to Redis channel: tracking:{vehicle_id}")
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    connections = self.active_connections.get(vehicle_id, [])
                    disconnected = []
                    
                    for connection in connections:
                        try:
                            await connection.send_json(data)
                        except Exception as error:
                            print(f"Local broadcast error: {error}")
                            disconnected.append(connection)
                            
                    for connection in disconnected:
                        self.disconnect(connection, vehicle_id)
                        
                # Exit the listener task if there are no local connections anymore
                if vehicle_id not in self.active_connections:
                    break
        except Exception as e:
            print(f"Redis listener error for {vehicle_id}: {e}")
        finally:
            await pubsub.unsubscribe(f"tracking:{vehicle_id}")
            await pubsub.close()
            print(f"Unsubscribed from Redis channel: tracking:{vehicle_id}")

    async def broadcast(self, vehicle_id: str, data: dict):
        print(f"Publishing GPS update to Redis channel tracking:{vehicle_id}")
        await self.redis.publish(f"tracking:{vehicle_id}", json.dumps(data))


manager = ConnectionManager()


# ============================================================
# DISTANCE CALCULATION
# ============================================================

def calculate_distance(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float,
) -> float:

    earth_radius = 6371000

    lat1 = math.radians(latitude1)
    lat2 = math.radians(latitude2)

    delta_lat = math.radians(
        latitude2 - latitude1
    )

    delta_lon = math.radians(
        longitude2 - longitude1
    )

    a = (
        math.sin(delta_lat / 2) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return earth_radius * c


# ============================================================
# DESTINATION / GEOFENCE
# ============================================================

DESTINATION_LATITUDE = 28.4744
DESTINATION_LONGITUDE = 77.5040

GEOFENCE_RADIUS = 500


# ============================================================
# LIVE VEHICLE TRACKING
# ============================================================

@router.websocket(
    "/tracking/{vehicle_id}"
)
async def vehicle_tracking(
    websocket: WebSocket,
    vehicle_id: str,
    db: Session = Depends(get_db),
):

    await manager.connect(
        websocket,
        vehicle_id,
    )

    print(
        f"Tracking started for vehicle "
        f"{vehicle_id}"
    )

    try:

        while True:

            # ------------------------------------------------
            # RECEIVE GPS
            # ------------------------------------------------

            data = await websocket.receive_json()

            print(
                "GPS received:"
            )

            print(data)

            latitude = data.get(
                "latitude"
            )

            longitude = data.get(
                "longitude"
            )

            speed = data.get(
                "speed",
                0,
            )

            recorded_time = data.get(
                "recorded_time"
            )

            # ------------------------------------------------
            # VALIDATION
            # ------------------------------------------------

            if (
                latitude is None
                or longitude is None
            ):

                await websocket.send_json({
                    "error": (
                        "latitude and "
                        "longitude are required"
                    )
                })

                continue

            # ------------------------------------------------
            # DISTANCE
            # ------------------------------------------------

            distance = calculate_distance(
                latitude,
                longitude,
                DESTINATION_LATITUDE,
                DESTINATION_LONGITUDE,
            )

            distance = round(
                distance,
                2,
            )

            # ------------------------------------------------
            # ETA ESTIMATION
            # ------------------------------------------------

            eta_seconds = 0
            formatted_eta = "--"
            if speed > 0:
                speed_ms = speed / 3.6
                eta_seconds = distance / speed_ms
                formatted_eta = format_duration(eta_seconds)

            # ------------------------------------------------
            # GEOFENCE
            # ------------------------------------------------

            inside_geofence = (
                distance <= GEOFENCE_RADIUS
            )

            # ------------------------------------------------
            # STATUS
            # ------------------------------------------------

            if inside_geofence:

                status = "Arrived"

                event = (
                    "Vehicle arrived "
                    "at destination"
                )

            else:

                status = "En Route"

                event = (
                    "Vehicle is approaching "
                    "destination"
                )

            # ------------------------------------------------
            # SAVE GPS TO DATABASE
            # ------------------------------------------------

            try:

                gps_record = GPSTracking(
                    vehicle_id=vehicle_id,
                    latitude=latitude,
                    longitude=longitude,
                    speed=speed,
                    recorded_time=(
                        datetime.utcnow()
                    ),
                )

                db.add(gps_record)
                db.commit()

            except Exception as error:

                db.rollback()

                print(
                    f"GPS database error: "
                    f"{error}"
                )

            # ------------------------------------------------
            # RESPONSE
            # ------------------------------------------------

            gps_response = {

                "vehicle_id": vehicle_id,

                "latitude": latitude,

                "longitude": longitude,

                "speed": speed,

                "recorded_time": (
                    recorded_time
                    or datetime.utcnow().isoformat()
                ),

                "distance_to_destination": distance,

                "eta_seconds": eta_seconds,

                "formatted_eta": formatted_eta,

                "geofence_radius": (
                    GEOFENCE_RADIUS
                ),

                "inside_geofence": (
                    inside_geofence
                ),

                "status": status,

                "event": event,
            }

            # ------------------------------------------------
            # SERVER LOG
            # ------------------------------------------------

            print(
                "--------------------------------------------------"
            )

            print(
                f"Vehicle: {vehicle_id}"
            )

            print(
                f"Latitude: {latitude}"
            )

            print(
                f"Longitude: {longitude}"
            )

            print(
                f"Speed: {speed} km/h"
            )

            print(
                f"Distance: {distance:.2f} meters"
            )

            print(
                f"Status: {status}"
            )

            print(
                f"EVENT: {event}"
            )

            # ------------------------------------------------
            # IMPORTANT:
            # BROADCAST TO SIMULATOR + BROWSER
            # ------------------------------------------------

            await manager.broadcast(
                vehicle_id,
                gps_response,
            )

    except WebSocketDisconnect:

        manager.disconnect(
            websocket,
            vehicle_id,
        )

    except Exception as error:

        print(
            "============================================================"
        )

        print(
            "WEBSOCKET ERROR"
        )

        print(
            f"Vehicle ID: {vehicle_id}"
        )

        print(
            f"Error: {error}"
        )

        print(
            "============================================================"
        )

        manager.disconnect(
            websocket,
            vehicle_id,
        )


# ============================================================
# SIMPLE GPS ENDPOINT
# ============================================================

@router.websocket("/gps")
async def gps_websocket(
    websocket: WebSocket,
    db: Session = Depends(get_db),
):

    await websocket.accept()

    try:

        while True:

            data = await websocket.receive_json()

            vehicle_id = data.get(
                "vehicle_id"
            )

            latitude = data.get(
                "latitude"
            )

            longitude = data.get(
                "longitude"
            )

            speed = data.get(
                "speed",
                0,
            )

            if (
                not vehicle_id
                or latitude is None
                or longitude is None
            ):

                await websocket.send_json({
                    "error": (
                        "vehicle_id, latitude "
                        "and longitude are required"
                    )
                })

                continue

            gps_record = GPSTracking(
                vehicle_id=vehicle_id,
                latitude=latitude,
                longitude=longitude,
                speed=speed,
                recorded_time=datetime.utcnow(),
            )

            db.add(gps_record)
            db.commit()
            db.refresh(gps_record)

            await websocket.send_json({

                "message": (
                    "GPS location recorded"
                ),

                "tracking_id": str(
                    gps_record.tracking_id
                ),

                "vehicle_id": str(
                    gps_record.vehicle_id
                ),

                "latitude": (
                    gps_record.latitude
                ),

                "longitude": (
                    gps_record.longitude
                ),

                "speed": gps_record.speed,

                "recorded_time": (
                    gps_record.recorded_time
                    .isoformat()
                ),
            })

    except WebSocketDisconnect:

        print(
            "GPS WebSocket disconnected"
        )