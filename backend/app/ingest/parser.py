"""FIT file -> runs + track_points rows. Idempotent by fit_filename."""

import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import fitdecode

from ..config import LOCAL_TZ, MAX_HR
from .derive import effort_bucket, pace_s_per_mi, semicircles_to_degrees, time_of_day

logger = logging.getLogger(__name__)

METERS_PER_MILE = 1609.344


@dataclass
class TrackPoint:
    t_offset_s: float
    lat: float
    lon: float
    ele_m: float | None
    hr: int | None
    pace_s_per_mi: float | None


@dataclass
class ParsedRun:
    started_at: datetime
    sport: str
    distance_mi: float
    duration_s: int
    avg_hr: int | None
    points: list[TrackPoint] = field(default_factory=list)


def _get(frame: fitdecode.FitDataMessage, name: str):
    try:
        v = frame.get_value(name)
    except KeyError:
        return None
    return v


def parse_fit(path: Path) -> ParsedRun | None:
    """Parse one FIT file. Returns None if it has no usable session."""
    session = None
    records = []
    with fitdecode.FitReader(path) as reader:
        for frame in reader:
            if not isinstance(frame, fitdecode.FitDataMessage):
                continue
            if frame.name == "session" and session is None:
                session = frame
            elif frame.name == "record":
                records.append(
                    (
                        _get(frame, "timestamp"),
                        _get(frame, "position_lat"),
                        _get(frame, "position_long"),
                        _get(frame, "enhanced_altitude") or _get(frame, "altitude"),
                        _get(frame, "heart_rate"),
                        _get(frame, "enhanced_speed") or _get(frame, "speed"),
                    )
                )

    if session is None:
        logger.warning("no session frame in %s, skipping", path.name)
        return None

    started_at = _get(session, "start_time")
    if started_at is None and records:
        started_at = records[0][0]
    if started_at is None:
        logger.warning("no start time in %s, skipping", path.name)
        return None
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)

    sport = str(_get(session, "sport") or "unknown")
    sub_sport = _get(session, "sub_sport")
    if sub_sport and str(sub_sport) not in ("generic", "None"):
        sport = f"{sport}/{sub_sport}"

    distance_m = _get(session, "total_distance") or 0.0
    duration_s = int(_get(session, "total_timer_time") or 0)
    avg_hr = _get(session, "avg_heart_rate")
    if avg_hr is None:
        hrs = [r[4] for r in records if r[4] is not None]
        avg_hr = round(sum(hrs) / len(hrs)) if hrs else None

    points = []
    for ts, lat_sc, lon_sc, ele, hr, speed in records:
        if ts is None or lat_sc is None or lon_sc is None:
            continue
        points.append(
            TrackPoint(
                t_offset_s=(ts - started_at).total_seconds(),
                lat=semicircles_to_degrees(lat_sc),
                lon=semicircles_to_degrees(lon_sc),
                ele_m=ele,
                hr=hr,
                pace_s_per_mi=pace_s_per_mi(speed),
            )
        )

    return ParsedRun(
        started_at=started_at,
        sport=sport,
        distance_mi=distance_m / METERS_PER_MILE,
        duration_s=duration_s,
        avg_hr=avg_hr,
        points=points,
    )


def ingest_file(conn: sqlite3.Connection, path: Path) -> bool:
    """Insert one FIT file into the DB. Returns True if a new run was added."""
    exists = conn.execute(
        "SELECT 1 FROM runs WHERE fit_filename = ?", (path.name,)
    ).fetchone()
    if exists:
        return False

    run = parse_fit(path)
    if run is None:
        return False

    local = run.started_at.astimezone(ZoneInfo(LOCAL_TZ))
    avg_pace = run.duration_s / run.distance_mi if run.distance_mi > 0 else None

    cur = conn.execute(
        """INSERT INTO runs (fit_filename, started_at, local_date, day_of_week,
               time_of_day, sport, distance_mi, duration_s, avg_pace_s_per_mi,
               avg_hr, effort)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            path.name,
            run.started_at.isoformat(),
            local.date().isoformat(),
            local.weekday(),
            time_of_day(local.hour),
            run.sport,
            run.distance_mi,
            run.duration_s,
            avg_pace,
            run.avg_hr,
            effort_bucket(run.avg_hr, MAX_HR),
        ),
    )
    run_id = cur.lastrowid
    conn.executemany(
        """INSERT INTO track_points (run_id, seq, t_offset_s, lat, lon, ele_m, hr,
               pace_s_per_mi)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (run_id, i, p.t_offset_s, p.lat, p.lon, p.ele_m, p.hr, p.pace_s_per_mi)
            for i, p in enumerate(run.points)
        ],
    )
    return True


def ingest_folder(conn: sqlite3.Connection, fit_dir: Path) -> int:
    """Ingest every not-yet-seen FIT file in the folder. Returns new-run count."""
    new = 0
    for path in sorted(fit_dir.glob("*.[fF][iI][tT]")):
        try:
            if ingest_file(conn, path):
                new += 1
                conn.commit()
        except Exception:
            logger.exception("failed to ingest %s", path.name)
            conn.rollback()
    return new
