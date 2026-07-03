"""Sync orchestration: fetch (best effort) then ingest, recorded in sync_log."""

import logging
import threading
from pathlib import Path

from ..config import FIT_DIR
from ..store import Store
from . import fetcher
from .derive import summarize
from .parser import parse_fit

logger = logging.getLogger(__name__)

_sync_lock = threading.Lock()


def ingest_folder(store: Store, fit_dir: Path) -> int:
    """Ingest every not-yet-seen FIT file in the folder. Returns new-run count."""
    new = 0
    for path in sorted(fit_dir.glob("*.[fF][iI][tT]")):
        if store.has_run(path.name):
            continue
        try:
            parsed = parse_fit(path)
            if parsed and store.add_run(summarize(parsed, path.name), parsed.points):
                new += 1
        except Exception:
            logger.exception("failed to ingest %s", path.name)
    return new


def run_sync(store: Store) -> dict:
    """Fetch new FIT files (if credentials set), ingest the folder, log the result.

    The fetcher hits an unofficial API and is allowed to fail: ingest still runs
    so manually dropped files are picked up, and the error lands in sync_log.
    """
    if not _sync_lock.acquire(blocking=False):
        return {"status": "already-running"}
    try:
        sync_id = store.sync_started()

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

        new_runs = ingest_folder(store, FIT_DIR)

        status = "error" if error and new_runs == 0 else "ok"
        store.sync_finished(sync_id, status, new_runs, error)
        return {"status": status, "new_runs": new_runs, "error": error}
    finally:
        _sync_lock.release()
