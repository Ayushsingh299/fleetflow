import asyncio
import json
import urllib.request
import urllib.error
import math
import datetime

# ================================================================
# FleetFlow Realistic GPS Simulator
# Fetches active trips and simulates GPS for each vehicle ALONG ITS ROUTE!
# ================================================================

BASE_URL = "http://127.0.0.1:8000"
WS_BASE  = "ws://127.0.0.1:8000"

EMAIL    = "admin@fleetflow.com"
PASSWORD = "Admin@123"

def get_token():
    from app.database import SessionLocal
    from app.models.user import User
    from app.core.security import create_access_token
    
    db = SessionLocal()
    user = db.query(User).filter(User.email == EMAIL).first()
    if not user:
        db.close()
        raise Exception(f"User {EMAIL} not found")
        
    token = create_access_token(data={"sub": user.email, "role": user.role.value})
    db.close()
    return token

def get_active_trips(token):
    req = urllib.request.Request(
        f"{BASE_URL}/trips/",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req) as res:
        trips = json.loads(res.read())
    return [t for t in trips if t.get("status") == "In Progress" and t.get("route_geometry")]

async def simulate_trip(trip, token, delay_start):
    import websockets
    vehicle_id = trip["vehicle_id"]
    ws_url = f"{WS_BASE}/ws/tracking/{vehicle_id}"
    
    await asyncio.sleep(delay_start)
    
    # Parse geometry
    try:
        geom = json.loads(trip["route_geometry"]) if isinstance(trip["route_geometry"], str) else trip["route_geometry"]
        coords = geom["coordinates"]
    except Exception:
        print(f"[{vehicle_id}] Bad geometry")
        return
        
    while True:
        try:
            print(f"[{vehicle_id}] Connecting to {ws_url}")
            async with websockets.connect(
                ws_url,
                ping_interval=20,
                ping_timeout=20,
                close_timeout=5,
            ) as ws:
                print(f"[{vehicle_id}] Connected OK")
                
                # Drive along the route coords
                idx = 0
                step_size = max(1, len(coords) // 100) # drive in 100 steps roughly
                
                while idx < len(coords):
                    coord = coords[idx]
                    lon, lat = coord[0], coord[1]
                    speed = 40 + (idx % 20) # Fake speed variations
                    
                    payload = {
                        "latitude":  lat,
                        "longitude": lon,
                        "speed":     speed,
                        "recorded_time": datetime.datetime.utcnow().isoformat(),
                    }
                    print(f"[{vehicle_id}] GPS -> lat={lat:.4f}, lon={lon:.4f}, speed={speed} km/h")
                    
                    await ws.send(json.dumps(payload))
                    await asyncio.sleep(2)
                    idx += step_size
                    
                print(f"[{vehicle_id}] Reached destination! Looping back for demo.")
                
        except Exception as e:
            print(f"[{vehicle_id}] Disconnected: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)

async def main():
    try:
        token = get_token()
        print("Logged in successfully.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    try:
        trips = get_active_trips(token)
        print(f"Found {len(trips)} active trips.")
    except Exception as e:
        print(f"Failed to fetch trips: {e}")
        return

    if not trips:
        print("No active trips with route geometry found. Run the app, create a trip, Start it, and restart simulator!")
        return

    tasks = []
    for i, trip in enumerate(trips):
        tasks.append(asyncio.create_task(simulate_trip(trip, token, i * 2)))

    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())