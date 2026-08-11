"""Sync orchestration: fetch (best effort) then ingest, recorded in sync_log."""

import logging
import threading
from pathlib import Path
from typing import Protocol

from ..config import FIT_DIR
from ..store import Store
from . import fetcher as coros_fetcher
from .derive import summarize
from .parser import parse_fit

logger = logging.getLogger(__name__)

_sync_lock = threading.Lock()


class Fetcher(Protocol):
    """Populates the FIT folder (ADR-0001): the only thing upstream of it.

    Adapters: the corosexport-backed fetcher module in prod, fakes in tests.
    The adapter owns its API's error vocabulary — run_sync never interprets an
    exception itself, it asks explain_failure for the sentence users will read.
    """

    def credentials_configured(self) -> bool: ...

    def fetch_new(self, fit_dir: Path) -> int: ...

    def explain_failure(self, exc: BaseException) -> str: ...


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


def run_sync(
    store: Store,
    fetcher: Fetcher = coros_fetcher,
    fit_dir: Path = FIT_DIR,
) -> dict:
    """Fetch new FIT files (if credentials set), ingest the folder, log the result.

    The fetcher hits an unofficial API and is allowed to fail: ingest still runs
    so manually dropped files are picked up, and the error lands in sync_log.

    Status is three-valued, because "the download failed" and "nothing new" look
    identical otherwise: "ok" (fetch reached COROS), "partial" (fetch failed but
    files already on disk were ingested), "error" (fetch failed, nothing gained).
    Only "ok" means the runs on screen are up to date with the watch.
    """
    if not _sync_lock.acquire(blocking=False):
        return {"status": "already-running"}
    try:
        sync_id = store.sync_started()

        error = None
        if fetcher.credentials_configured():
            try:
                fetched = fetcher.fetch_new(fit_dir)
                logger.info("fetched %d new FIT files", fetched)
            except Exception as exc:
                error = fetcher.explain_failure(exc)
                logger.exception("COROS fetch failed")
        else:
            error = (
                "COROS credentials are not configured, so no new runs were "
                "downloaded — set COROS_EMAIL and COROS_PASSWORD in .env and "
                "restart the backend. Files dropped in data/fit still ingest."
            )

        new_runs = ingest_folder(store, fit_dir)

        if not error:
            status = "ok"
        else:
            status = "partial" if new_runs else "error"
        store.sync_finished(sync_id, status, new_runs, error)
        return {"status": status, "new_runs": new_runs, "error": error}
    finally:
        _sync_lock.release()
