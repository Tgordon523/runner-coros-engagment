"""Pure derivations from raw run numbers. See CONTEXT.md for Effort definition."""

from ..config import EFFORT_BUCKETS

METERS_PER_MILE = 1609.344

# Local start hour -> time-of-day bucket (upper bound exclusive)
TIME_OF_DAY_BUCKETS = [
    ("morning", 5, 12),
    ("lunch", 12, 14),
    ("evening", 14, 21),
]


def effort_bucket(avg_hr: int | None, max_hr: int) -> str | None:
    if avg_hr is None:
        return None
    frac = avg_hr / max_hr
    for name, lo, hi in EFFORT_BUCKETS:
        if lo <= frac < hi:
            return name
    return None


def time_of_day(local_hour: int) -> str:
    for name, lo, hi in TIME_OF_DAY_BUCKETS:
        if lo <= local_hour < hi:
            return name
    return "night"


def pace_s_per_mi(speed_m_s: float | None) -> float | None:
    if not speed_m_s or speed_m_s <= 0:
        return None
    return METERS_PER_MILE / speed_m_s


def semicircles_to_degrees(v: int) -> float:
    return v * (180.0 / 2**31)
