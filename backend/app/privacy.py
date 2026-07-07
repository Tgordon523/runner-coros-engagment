"""Privacy Zone trim, purely: tracks in, tracks out. See CONTEXT.md —
applied to exports only; local views always get full tracks."""

import math

from .trackpoint import LAT, LON

EARTH_R_M = 6_371_000.0


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
