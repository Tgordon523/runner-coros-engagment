"""Run Store: every SQL statement in the app lives behind this interface.

Adapters: file DB in prod, ":memory:" in tests.
"""

import sqlite3
import threading
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from . import effort
from .config import LOCAL_TZ, MAX_HR
from .dashboard import pace_trend, weekly_mileage
from .db import SCHEMA
from .filters import RunFilter
from .goal import goal_status
from .ingest.derive import RunRow
from .ingest.parser import TrackPoint
from .trackpoint import WIRE_SELECT


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# Inner select: the runs table plus computed effort. Filters (including the
# Effort filter) run against this in an outer query, so RunFilter stays
# ignorant of how effort is derived.
_CASE_SQL, _CASE_PARAMS = effort.case_sql()
RUNS_WITH_EFFORT = f"SELECT *, {_CASE_SQL} AS effort FROM runs"


class Store:
    def __init__(self, db_path: str):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(SCHEMA)
        self._lock = threading.Lock()

    # -- settings -----------------------------------------------------------

    def max_hr(self) -> int:
        """Current max HR: the settings row wins, env/config default otherwise."""
        with self._lock:
            row = self._conn.execute(
                "SELECT value FROM settings WHERE key = 'max_hr'"
            ).fetchone()
        return int(row["value"]) if row else MAX_HR

    def privacy_zones(self) -> list[dict]:
        import json

        with self._lock:
            row = self._conn.execute(
                "SELECT value FROM settings WHERE key = 'privacy_zones'"
            ).fetchone()
        return json.loads(row["value"]) if row else []

    def annual_goal_mi(self) -> float:
        with self._lock:
            row = self._conn.execute(
                "SELECT value FROM settings WHERE key = 'annual_goal_mi'"
            ).fetchone()
        return float(row["value"]) if row else 0.0

    def set_setting(self, key: str, value: str) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )

    def _effort_params(self) -> list[int]:
        return [self.max_hr()] * _CASE_PARAMS

    # -- runs ---------------------------------------------------------------

    def has_run(self, fit_filename: str) -> bool:
        with self._lock:
            row = self._conn.execute(
                "SELECT 1 FROM runs WHERE fit_filename = ?", (fit_filename,)
            ).fetchone()
        return row is not None

    def add_run(self, run: RunRow, points: list[TrackPoint]) -> bool:
        """Insert a run and its track. Returns False if the file was already ingested."""
        if self.has_run(run.fit_filename):
            return False
        with self._lock, self._conn:
            cur = self._conn.execute(
                """INSERT INTO runs (fit_filename, started_at, local_date,
                       day_of_week, time_of_day, sport, distance_mi, duration_s,
                       avg_pace_s_per_mi, avg_hr)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    run.fit_filename,
                    run.started_at,
                    run.local_date,
                    run.day_of_week,
                    run.time_of_day,
                    run.sport,
                    run.distance_mi,
                    run.duration_s,
                    run.avg_pace_s_per_mi,
                    run.avg_hr,
                ),
            )
            run_id = cur.lastrowid
            self._conn.executemany(
                """INSERT INTO track_points (run_id, seq, t_offset_s, lat, lon,
                       ele_m, hr, pace_s_per_mi)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    (run_id, i, p.t_offset_s, p.lat, p.lon, p.ele_m, p.hr, p.pace_s_per_mi)
                    for i, p in enumerate(points)
                ],
            )
        return True

    def runs(self, f: RunFilter) -> list[dict]:
        where, params = f.where()
        effort_params = self._effort_params()
        with self._lock:
            rows = self._conn.execute(
                f"SELECT * FROM ({RUNS_WITH_EFFORT}) WHERE {where} "
                "ORDER BY started_at DESC",
                effort_params + params,
            ).fetchall()
        return [dict(r) for r in rows]

    def run_track(self, run_id: int) -> list[dict] | None:
        with self._lock:
            run = self._conn.execute(
                "SELECT 1 FROM runs WHERE id = ?", (run_id,)
            ).fetchone()
            if run is None:
                return None
            rows = self._conn.execute(
                """SELECT t_offset_s, lat, lon, ele_m, hr, pace_s_per_mi
                   FROM track_points WHERE run_id = ? ORDER BY seq""",
                (run_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    def tracks(self, f: RunFilter, max_points: int = 150_000) -> list[dict]:
        """Filtered tracks for map layers: one entry per run, points as
        positional tuples in the trackpoint.WIRE_COLUMNS order.

        The interface promises at most ~max_points total; decimation strategy
        (currently every-Nth per run, endpoints kept) is implementation.
        """
        where, params = f.where()
        effort_params = self._effort_params()
        with self._lock:
            runs = self._conn.execute(
                f"SELECT id, started_at, distance_mi, effort "
                f"FROM ({RUNS_WITH_EFFORT}) WHERE {where} ORDER BY started_at",
                effort_params + params,
            ).fetchall()
            if not runs:
                return []
            ids = [r["id"] for r in runs]
            marks = ",".join("?" * len(ids))
            total = self._conn.execute(
                f"SELECT COUNT(*) FROM track_points WHERE run_id IN ({marks})", ids
            ).fetchone()[0]
            stride = max(1, -(-total // max_points))
            out = []
            for r in runs:
                pts = self._conn.execute(
                    f"""SELECT {WIRE_SELECT}
                       FROM track_points
                       WHERE run_id = ? AND (seq % ? = 0 OR seq =
                           (SELECT MAX(seq) FROM track_points WHERE run_id = ?))
                       ORDER BY seq""",
                    (r["id"], stride, r["id"]),
                ).fetchall()
                out.append(
                    {
                        "run_id": r["id"],
                        "started_at": r["started_at"],
                        "distance_mi": r["distance_mi"],
                        "effort": r["effort"],
                        "points": [list(p) for p in pts],
                    }
                )
        return out

    def dashboard(self, f: RunFilter, today: date | None = None) -> dict:
        """Everything the Dashboard renders, in one payload.

        Weekly mileage and pace trend respect the filter; Goal status is
        always the unfiltered current calendar year (see CONTEXT.md).
        """
        today = today or datetime.now(ZoneInfo(LOCAL_TZ)).date()
        rows = self.runs(f)
        with self._lock:
            ytd = self._conn.execute(
                "SELECT COALESCE(SUM(distance_mi), 0) FROM runs "
                "WHERE local_date >= ?",
                (date(today.year, 1, 1).isoformat(),),
            ).fetchone()[0]
        return {
            "weekly": weekly_mileage(rows),
            "pace_trend": pace_trend(rows),
            "goal": goal_status(self.annual_goal_mi(), ytd, today),
        }

    def meta(self) -> dict:
        """What the filter panel needs to render its options."""
        with self._lock:
            sports = [
                r["sport"]
                for r in self._conn.execute(
                    "SELECT DISTINCT sport FROM runs ORDER BY sport"
                ).fetchall()
            ]
            row = self._conn.execute(
                "SELECT MIN(local_date) AS first, MAX(local_date) AS last, "
                "COUNT(*) AS count FROM runs"
            ).fetchone()
        return {
            "sports": sports,
            "efforts": effort.NAMES,
            "first_date": row["first"],
            "last_date": row["last"],
            "run_count": row["count"],
        }

    # -- sync log -----------------------------------------------------------

    def sync_started(self) -> int:
        with self._lock, self._conn:
            cur = self._conn.execute(
                "INSERT INTO sync_log (started_at, status) VALUES (?, 'running')",
                (_now(),),
            )
        return cur.lastrowid

    def sync_finished(
        self, sync_id: int, status: str, new_runs: int, error: str | None
    ) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                """UPDATE sync_log SET finished_at = ?, status = ?, new_runs = ?,
                   error = ? WHERE id = ?""",
                (_now(), status, new_runs, error, sync_id),
            )

    def last_sync(self) -> dict | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM sync_log ORDER BY id DESC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None
