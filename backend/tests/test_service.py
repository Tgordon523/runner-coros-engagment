from pathlib import Path

from synthfit import write_synthetic_fit

from app.ingest import service
from app.ingest.service import ingest_folder, run_sync


class FakeFetcher:
    """Test adapter for the service.Fetcher interface."""

    def __init__(self, configured=True, error=None, fetched=0):
        self.configured = configured
        self.error = error
        self.fetched = fetched
        self.calls: list[Path] = []

    def credentials_configured(self) -> bool:
        return self.configured

    def fetch_new(self, fit_dir: Path) -> int:
        self.calls.append(fit_dir)
        if self.error:
            raise self.error
        return self.fetched

    def explain_failure(self, exc: BaseException) -> str:
        return f"fetch failed: {exc}"


def test_ingest_folder_survives_unparseable_file(store, tmp_path):
    (tmp_path / "bad.fit").write_bytes(b"not a fit file")
    assert ingest_folder(store, tmp_path) == 0


def test_run_sync_skips_fetch_without_credentials(store, tmp_path):
    fetcher = FakeFetcher(configured=False)
    result = run_sync(store, fetcher=fetcher, fit_dir=tmp_path)
    assert fetcher.calls == []
    assert "not configured" in result["error"]
    assert store.last_sync()["status"] == result["status"] == "error"


def test_run_sync_fetches_into_fit_dir(store, tmp_path):
    fetcher = FakeFetcher(fetched=2)
    result = run_sync(store, fetcher=fetcher, fit_dir=tmp_path)
    assert fetcher.calls == [tmp_path]
    assert result == {"status": "ok", "new_runs": 0, "error": None}
    assert store.last_sync()["status"] == "ok"


def test_run_sync_ingests_even_when_fetch_fails(store, tmp_path):
    (tmp_path / "bad.fit").write_bytes(b"not a fit file")
    fetcher = FakeFetcher(error=RuntimeError("code 1019"))
    result = run_sync(store, fetcher=fetcher, fit_dir=tmp_path)
    assert result["error"] == "fetch failed: code 1019"
    assert result["status"] == "error"  # nothing ingested either
    last = store.last_sync()
    assert last["status"] == "error"
    assert "code 1019" in last["error"]


def test_run_sync_reports_partial_when_fetch_fails_but_files_ingest(store, tmp_path):
    """A failed download must stay visible even when local files did ingest."""
    write_synthetic_fit(tmp_path / "local.fit")
    fetcher = FakeFetcher(error=RuntimeError("Access token is invalid"))
    result = run_sync(store, fetcher=fetcher, fit_dir=tmp_path)
    assert result["status"] == "partial"
    assert result["new_runs"] == 1
    assert "Access token is invalid" in result["error"]
    assert store.last_ok_sync_at() is None  # partial never counts as fresh


def test_last_ok_sync_at_tracks_only_successful_syncs(store, tmp_path):
    run_sync(store, fetcher=FakeFetcher(), fit_dir=tmp_path)
    ok_at = store.last_ok_sync_at()
    assert ok_at

    run_sync(store, fetcher=FakeFetcher(error=RuntimeError("boom")), fit_dir=tmp_path)
    assert store.last_sync()["status"] == "error"
    assert store.last_ok_sync_at() == ok_at  # staleness survives a later failure


def test_run_sync_refuses_to_run_concurrently(store, tmp_path):
    fetcher = FakeFetcher()
    assert service._sync_lock.acquire(blocking=False)
    try:
        assert run_sync(store, fetcher=fetcher, fit_dir=tmp_path) == {
            "status": "already-running"
        }
    finally:
        service._sync_lock.release()
    assert fetcher.calls == []
    assert store.last_sync() is None
