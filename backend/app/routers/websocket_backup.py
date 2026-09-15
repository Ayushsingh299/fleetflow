from fastapi import APIRouter, WebSocket, WebSocketDisconnect


router = APIRouter(tags=["WebSocket Tracking"])


class ConnectionManager:

    def __init__(self):
        # vehicle_id -> list of connected WebSocket clients
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, vehicle_id: str, websocket: WebSocket):
        await websocket.accept()

        if vehicle_id not in self.connections:
            self.connections[vehicle_id] = []

        self.connections[vehicle_id].append(websocket)

        print(
            f"WebSocket connected: vehicle={vehicle_id}, "
            f"connections={len(self.connections[vehicle_id])}"
        )

    def disconnect(self, vehicle_id: str, websocket: WebSocket):
        if vehicle_id not in self.connections:
            return

        if websocket in self.connections[vehicle_id]:
            self.connections[vehicle_id].remove(websocket)

        if not self.connections[vehicle_id]:
            del self.connections[vehicle_id]

        print(f"WebSocket disconnected: vehicle={vehicle_id}")

    async def broadcast(self, vehicle_id: str, message: dict):

        if vehicle_id not in self.connections:
            return

        disconnected = []

        for connection in self.connections[vehicle_id]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(vehicle_id, connection)


manager = ConnectionManager()


@router.websocket("/ws/tracking/{vehicle_id}")
async def vehicle_tracking(
    websocket: WebSocket,
    vehicle_id: str
):
    await manager.connect(vehicle_id, websocket)

    try:
        while True:

            data = await websocket.receive_json()

            message = {
                "vehicle_id": vehicle_id,
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
                "speed": data.get("speed", 0),
                "recorded_time": data.get("recorded_time"),
            }

            await manager.broadcast(
                vehicle_id,
                message
            )

    except WebSocketDisconnect:
        manager.disconnect(
            vehicle_id,
            websocket
        )

    except Exception as e:
        print(f"WebSocket error: {e}")

        manager.disconnect(
            vehicle_id,
            websocket
        )