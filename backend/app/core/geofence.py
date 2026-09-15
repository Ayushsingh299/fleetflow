from math import radians, sin, cos, sqrt, atan2


def calculate_distance_meters(
    vehicle_latitude: float,
    vehicle_longitude: float,
    zone_latitude: float,
    zone_longitude: float,
) -> float:
    """
    Calculate distance between vehicle and destination
    using the Haversine formula.
    """

    earth_radius = 6_371_000

    lat1 = radians(vehicle_latitude)
    lat2 = radians(zone_latitude)

    delta_lat = radians(
        zone_latitude - vehicle_latitude
    )

    delta_lon = radians(
        zone_longitude - vehicle_longitude
    )

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a),
    )

    return earth_radius * c


def is_inside_geofence(
    vehicle_latitude: float,
    vehicle_longitude: float,
    zone_latitude: float,
    zone_longitude: float,
    radius_meters: float = 500,
) -> bool:

    distance = calculate_distance_meters(
        vehicle_latitude,
        vehicle_longitude,
        zone_latitude,
        zone_longitude,
    )

    return distance <= radius_meters