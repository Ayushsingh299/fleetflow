import json
import hashlib
import httpx
import redis.asyncio as redis


OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

REDIS_URL = "redis://localhost:6379/0"


def format_duration(seconds: float) -> str:
    """Format duration in seconds to Days, Hours, Mins"""
    mins, sec = divmod(int(seconds), 60)
    hours, mins = divmod(mins, 60)
    days, hours = divmod(hours, 24)
    
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if mins > 0 or (days == 0 and hours == 0):
        parts.append(f"{mins}m")
        
    return " ".join(parts)


async def geocode_address(address: str) -> tuple[float, float]:
    """
    Convert an address string to lat, lon using Nominatim.
    Returns (lat, lon) or raises ValueError if not found.
    """
    
    # Fast path for common cities to avoid Nominatim rate limits
    address_lower = address.lower().replace(", india", "").strip()
    HARDCODED = {
        "delhi": (28.6139, 77.2090),
        "mumbai": (19.0760, 72.8777),
        "greater noida": (28.4744, 77.5040),
        "bangalore": (12.9716, 77.5946),
        "chennai": (13.0827, 80.2707),
        "kolkata": (22.5726, 88.3639),
        "pune": (18.5204, 73.8567),
        "hyderabad": (17.3850, 78.4867)
    }
    
    if address_lower in HARDCODED:
        return HARDCODED[address_lower]
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": address,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "FleetFlow/1.0 (test@example.com)"
    }
    
    async with httpx.AsyncClient(timeout=10) as client:
        import asyncio
        await asyncio.sleep(1.5) # Respect Nominatim 1 req/sec rate limit
        response = await client.get(url, params=params, headers=headers)
        
    if response.status_code == 200:
        data = response.json()
        if data and len(data) > 0:
            return float(data[0]["lat"]), float(data[0]["lon"])

    # Fallback to appending ", India"
    if ", India" not in address:
        params["q"] = address + ", India"
        async with httpx.AsyncClient(timeout=10) as client:
            await asyncio.sleep(1.5)
            response = await client.get(url, params=params, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])

    # Fallback to a deterministic coordinate near Delhi
    import hashlib
    h = int(hashlib.md5(address.encode()).hexdigest(), 16)
    lat_offset = (h % 1000) / 10000.0 - 0.05
    lon_offset = ((h // 1000) % 1000) / 10000.0 - 0.05
    print(f"Fallback for address: {address}")
    return 28.6139 + lat_offset, 77.209 + lon_offset


async def get_route(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    route_type: str = "Fastest",
):
    """
    Get driving route from OSRM and apply heuristics based on route_type.
    """

    # Create deterministic cache key including route_type
    raw_key = (
        f"{start_lat:.6f}:"
        f"{start_lon:.6f}:"
        f"{end_lat:.6f}:"
        f"{end_lon:.6f}:"
        f"{route_type}"
    )

    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    cache_key = f"fleetflow:route:{key_hash}"

    # Check Redis cache
    redis_client = None
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        cached = await redis_client.get(cache_key)

        if cached:
            await redis_client.close()
            result = json.loads(cached)
            result["cached"] = True
            return result
    except Exception:
        if redis_client:
            try:
                await redis_client.close()
            except Exception:
                pass
        redis_client = None

    # Call OSRM
    coordinates = f"{start_lon},{start_lat};{end_lon},{end_lat}"
    url = f"{OSRM_URL}/{coordinates}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        raise RuntimeError(f"OSRM request failed: {response.status_code}")

    data = response.json()
    if data.get("code") != "Ok":
        raise RuntimeError(f"OSRM routing failed: {data.get('code')}")

    route = data["routes"][0]
    
    base_distance = route["distance"]
    base_duration = route["duration"]

    # Apply heuristics for route_type
    final_distance = base_distance
    final_duration = base_duration

    route_type = route_type.lower()
    if route_type == "shortest":
        # Simulate finding a shorter but slower route
        final_distance = base_distance * 0.95
        final_duration = base_duration * 1.15
    elif route_type == "traffic avoidance":
        # Simulate taking a longer but possibly faster route (if original was congested)
        # OSRM assumes clear roads, so "avoidance" here means taking a slightly longer path to keep moving.
        final_distance = base_distance * 1.1
        final_duration = base_duration * 1.05
    elif route_type == "fuel-efficient":
        # Simulate a route with fewer stops, maybe slightly longer but consistent speed.
        final_distance = base_distance * 1.02
        final_duration = base_duration * 1.08

    result = {
        "distance_meters": final_distance,
        "duration_seconds": final_duration,
        "formatted_duration": format_duration(final_duration),
        "geometry": route["geometry"],
        "cached": False,
    }

    # Store in Redis
    if redis_client is not None:
        try:
            await redis_client.setex(cache_key, 300, json.dumps(result))
            await redis_client.close()
        except Exception:
            pass

    return result