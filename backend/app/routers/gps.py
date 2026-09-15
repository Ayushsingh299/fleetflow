from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.gps_tracking import GPSTracking


router = APIRouter(
    prefix="/ws",
    tags=["GPS Tracking"]
)


@router.websocket("/gps")
async def gps_websocket(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()

            vehicle_id = data.get("vehicle_id")
            latitude = data.get("latitude")
            longitude = data.get("longitude")
            speed = data.get("speed", 0)

            if not vehicle_id or latitude is None or longitude is None:
                await websocket.send_json({
                    "error": "vehicle_id, latitude and longitude are required"
                })
                continue

            gps_record = GPSTracking(
                vehicle_id=vehicle_id,
                latitude=latitude,
                longitude=longitude,
                speed=speed,
                recorded_time=datetime.utcnow()
            )

            db.add(gps_record)
            db.commit()
            db.refresh(gps_record)

            await websocket.send_json({
                "message": "GPS location recorded",
                "tracking_id": str(gps_record.tracking_id),
                "vehicle_id": str(gps_record.vehicle_id),
                "latitude": gps_record.latitude,
                "longitude": gps_record.longitude,
                "speed": gps_record.speed,
                "recorded_time": gps_record.recorded_time.isoformat()
            })

    except WebSocketDisconnect:
        print("GPS WebSocket disconnected")