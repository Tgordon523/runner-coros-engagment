"""Run Store: every SQL statement in the app lives behind this interface.

Adapters: file DB in prod, ":memory:" in tests.
"""

import sqlite3
import threading
from datetime import datetime, timezone

from .db import SCHEMA
from .filters import RunFilter
from .ingest.derive import RunRow
from .ingest.parser import TrackPoint

RUN_COLUMNS = (
    "id, fit_filename, started_at, local_date, day_of_week, time_of_day, "
    "sport, distance_mi, duration_s, avg_pace_s_per_mi, avg_hr, effort"
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, db_path: str):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(SCHEMA)
        self._lock = threading.Lock()

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
                       avg_pace_s_per_mi, avg_hr, effort)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
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
                    run.effort,
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
        with self._lock:
            rows = self._conn.execute(
                f"SELECT {RUN_COLUMNS} FROM runs WHERE {where} ORDER BY started_at DESC",
                params,
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

    def tracks(self, f: RunFilter) -> list[dict]:
        """Filtered tracks for map layers: one entry per run, points as
        [lon, lat, t_offset_s, hr, pace_s_per_mi] tuples (deck.gl-friendly)."""
        where, params = f.where()
        with self._lock:
            runs = self._conn.execute(
                f"SELECT id, started_at, distance_mi, effort FROM runs "
                f"WHERE {where} ORDER BY started_at",
                params,
            ).fetchall()
            out = []
            for r in runs:
                pts = self._conn.execute(
                    """SELECT lon, lat, t_offset_s, hr, pace_s_per_mi
                       FROM track_points WHERE run_id = ? ORDER BY seq""",
                    (r["id"],),
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
