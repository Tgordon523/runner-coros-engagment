"""Privacy Zone and Start Zone trims, purely: tracks in, tracks out. See
CONTEXT.md — applied to exports only; local views always get full tracks."""

import math

from .trackpoint import LAT, LON

EARTH_R_M = 6_371_000.0
START_ZONE_RADIUS_M = 400.0


def _dist_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in meters."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R_M * math.asin(math.sqrt(a))


def apply_privacy_zones(tracks: list[dict], zones: list[dict]) -> list[dict]:
    """Drop track points inside any zone ({lat, lon, radius_m}).

    Points use the trackpoint wire layout; runs whose every point is trimmed
    disappear.
    """
    if not zones:
        return tracks
    out = []
    for track in tracks:
        kept = [
            p
            for p in track["points"]
            if not any(
                _dist_m(p[LAT], p[LON], z["lat"], z["lon"]) <= z["radius_m"]
                for z in zones
            )
        ]
        if kept:
            out.append({**track, "points": kept})
    return out


def apply_start_zones(
    tracks: list[dict], radius_m: float = START_ZONE_RADIUS_M
) -> list[dict]:
    """Start Zone (CONTEXT.md): per run, drop points within radius_m of that
    run's first point — including a finish that returns near the start. Each
    run is trimmed only by its own zone; runs fully inside theirs disappear.
    """
    out = []
    for track in tracks:
        if not track["points"]:
            out.append(track)
            continue
        first = track["points"][0]
        zone = {"lat": first[LAT], "lon": first[LON], "radius_m": radius_m}
        out.extend(apply_privacy_zones([track], [zone]))
    return out
