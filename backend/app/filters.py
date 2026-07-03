"""RunFilter: the one place filter params become SQL.

Every map/chart endpoint shares this interface; see CONTEXT.md for Period,
Day, and Effort.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import HTTPException, Query

from .config import LOCAL_TZ

PRESET_DAYS = {"7d": 7, "30d": 30, "90d": 90}
EFFORTS = {"easy", "moderate", "hard", "max"}
TIMES_OF_DAY = {"morning", "lunch", "evening", "night"}


def _local_today() -> date:
    from datetime import datetime

    return datetime.now(ZoneInfo(LOCAL_TZ)).date()


def _csv(value: str | None) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()] if value else []


@dataclass
class RunFilter:
    start: date | None = None
    end: date | None = None
    days: list[int] = field(default_factory=list)  # 0=Monday
    efforts: list[str] = field(default_factory=list)
    times_of_day: list[str] = field(default_factory=list)
    sports: list[str] = field(default_factory=list)
    min_mi: float | None = None
    max_mi: float | None = None

    def where(self) -> tuple[str, list]:
        """Build the WHERE clause (without the keyword) and its parameters."""
        conds, params = [], []
        if self.start:
            conds.append("local_date >= ?")
            params.append(self.start.isoformat())
        if self.end:
            conds.append("local_date <= ?")
            params.append(self.end.isoformat())
        for column, values in (
            ("day_of_week", self.days),
            ("effort", self.efforts),
            ("time_of_day", self.times_of_day),
            ("sport", self.sports),
        ):
            if values:
                conds.append(f"{column} IN ({','.join('?' * len(values))})")
                params.extend(values)
        if self.min_mi is not None:
            conds.append("distance_mi >= ?")
            params.append(self.min_mi)
        if self.max_mi is not None:
            conds.append("distance_mi <= ?")
            params.append(self.max_mi)
        return (" AND ".join(conds) or "1=1", params)


def resolve_period(
    period: str | None, start: date | None, end: date | None
) -> tuple[date | None, date | None]:
    """Preset -> date range. Explicit start/end win over the preset."""
    if start or end:
        return start, end
    if period in (None, "all"):
        return None, None
    today = _local_today()
    if period in PRESET_DAYS:
        return today - timedelta(days=PRESET_DAYS[period] - 1), today
    if period == "ytd":
        return date(today.year, 1, 1), today
    if period.startswith("year-"):
        try:
            year = int(period.removeprefix("year-"))
        except ValueError:
            raise HTTPException(422, f"bad period: {period!r}")
        return date(year, 1, 1), date(year, 12, 31)
    raise HTTPException(422, f"unknown period: {period!r}")


def run_filter(
    period: Annotated[str | None, Query(description="7d|30d|90d|ytd|year-YYYY|all")] = None,
    start: date | None = None,
    end: date | None = None,
    day: Annotated[str | None, Query(description="comma list, 0=Monday e.g. 5,6")] = None,
    effort: Annotated[str | None, Query(description="comma list of easy,moderate,hard,max")] = None,
    time_of_day: Annotated[str | None, Query(description="comma list of morning,lunch,evening,night")] = None,
    sport: Annotated[str | None, Query(description="comma list, exact sport values")] = None,
    min_mi: float | None = None,
    max_mi: float | None = None,
) -> RunFilter:
    """FastAPI dependency: parse the shared filter params once."""
    efforts = _csv(effort)
    if bad := set(efforts) - EFFORTS:
        raise HTTPException(422, f"unknown effort: {sorted(bad)}")
    times = _csv(time_of_day)
    if bad := set(times) - TIMES_OF_DAY:
        raise HTTPException(422, f"unknown time_of_day: {sorted(bad)}")
    try:
        days = [int(d) for d in _csv(day)]
    except ValueError:
        raise HTTPException(422, "day must be integers 0-6")
    if any(d < 0 or d > 6 for d in days):
        raise HTTPException(422, "day must be 0-6 (0=Monday)")

    start, end = resolve_period(period, start, end)
    return RunFilter(
        start=start,
        end=end,
        days=days,
        efforts=efforts,
        times_of_day=times,
        sports=_csv(sport),
        min_mi=min_mi,
        max_mi=max_mi,
    )
