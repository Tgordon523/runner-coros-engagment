"""Pure derivations: ParsedRun -> RunRow, no I/O. See CONTEXT.md for Effort."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from ..config import LOCAL_TZ

if TYPE_CHECKING:
    from .parser import ParsedRun

METERS_PER_MILE = 1609.344

# Local start hour -> time-of-day bucket (upper bound exclusive)
TIME_OF_DAY_BUCKETS = [
    ("morning", 5, 12),
    ("lunch", 12, 14),
    ("evening", 14, 21),
]


@dataclass
class RunRow:
    """One row of the runs table (minus id), ready for the store.

    Effort is deliberately absent: it is computed by the store at read time
    from avg_hr and the current max-HR setting (see CONTEXT.md).
    """

    fit_filename: str
    started_at: str  # UTC ISO 8601
    local_date: str  # YYYY-MM-DD
    day_of_week: int  # 0=Monday
    time_of_day: str
    sport: str
    distance_mi: float
    duration_s: int
    avg_pace_s_per_mi: float | None
    avg_hr: int | None


def summarize(
    parsed: "ParsedRun",
    fit_filename: str,
    *,
    local_tz: str = LOCAL_TZ,
) -> RunRow:
    """Everything derived-at-ingest about a run happens here, purely."""
    local = parsed.started_at.astimezone(ZoneInfo(local_tz))
    return RunRow(
        fit_filename=fit_filename,
        started_at=parsed.started_at.isoformat(),
        local_date=local.date().isoformat(),
        day_of_week=local.weekday(),
        time_of_day=time_of_day(local.hour),
        sport=parsed.sport,
        distance_mi=parsed.distance_mi,
        duration_s=parsed.duration_s,
        avg_pace_s_per_mi=(
            parsed.duration_s / parsed.distance_mi if parsed.distance_mi > 0 else None
        ),
        avg_hr=parsed.avg_hr,
    )


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
