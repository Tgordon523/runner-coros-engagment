"""Sync orchestration: fetch (best effort) then ingest, recorded in sync_log."""

import logging
import threading
from datetime import datetime, timezone

from ..config import FIT_DIR
from ..db import connect
from . import fetcher, parser

logger = logging.getLogger(__name__)

_sync_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_sync() -> dict:
    """Fetch new FIT files (if credentials set), ingest the folder, log the result.

    The fetcher hits an unofficial API and is allowed to fail: ingest still runs
    so manually dropped files are picked up, and the error lands in sync_log.
    """
    if not _sync_lock.acquire(blocking=False):
        return {"status": "already-running"}
    try:
        conn = connect()
        cur = conn.execute(
            "INSERT INTO sync_log (started_at, status) VALUES (?, 'running')",
            (_now(),),
        )
        sync_id = cur.lastrowid
        conn.commit()

        error = None
        if fetcher.credentials_configured():
            try:
                fetched = fetcher.fetch_new(FIT_DIR)
                logger.info("fetched %d new FIT files", fetched)
            except Exception as exc:
                error = f"fetch failed: {exc}"
                logger.exception("COROS fetch failed")
        else:
            error = "fetch skipped: COROS credentials not configured"

        new_runs = parser.ingest_folder(conn, FIT_DIR)

        status = "error" if error and new_runs == 0 else "ok"
        conn.execute(
            """UPDATE sync_log SET finished_at = ?, status = ?, new_runs = ?,
               error = ? WHERE id = ?""",
            (_now(), status, new_runs, error, sync_id),
        )
        conn.commit()
        conn.close()
        return {"status": status, "new_runs": new_runs, "error": error}
    finally:
        _sync_lock.release()


def last_sync() -> dict | None:
    conn = connect()
    row = conn.execute(
        "SELECT * FROM sync_log ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return dict(row) if row else None
