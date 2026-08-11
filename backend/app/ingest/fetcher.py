"""Download new FIT files from COROS Training Hub into the FIT folder.

Uses corosexport's unofficial API (see docs/adr/0001). Everything downstream
depends only on the folder contents, never on this module. This module is the
prod adapter for the service.Fetcher interface; corosexport is imported lazily
inside fetch_new so importing this module has no side effects.

This module also owns the COROS error vocabulary: explain_failure turns an
unofficial-API exception into a sentence the sync log and the UI can show.
"""

import inspect
import logging
from pathlib import Path

from ..config import COROS_API_BASE, COROS_EMAIL, COROS_PASSWORD

logger = logging.getLogger(__name__)

US_HOST = "https://teamapi.coros.com"
EU_HOST = "https://teameuapi.coros.com"

# Module globals corosexport <=0.1.4 read for its endpoints, and the path each
# one points at. 0.1.5 moved these onto the client constructor (see _make_client).
_ENDPOINT_GLOBALS = {
    "COROS_BASE_URL": "",
    "AUTH_ENDPOINT": "/account/login",
    "ACTIVITIES_ENDPOINT": "/activity/query",
    "DOWNLOAD_ENDPOINT": "/activity/detail/download",
}
_ENDPOINT_ATTRS = ("base_url", "auth_endpoint", "activities_endpoint", "download_endpoint")


def credentials_configured() -> bool:
    return bool(COROS_EMAIL and COROS_PASSWORD)


def _make_client(client_cls, client_module):
    """Build a CorosClient bound to COROS_API_BASE, whichever knob it exposes.

    corosexport hardcodes the EU host, but a token is only honored by the
    account's home region: the wrong host still logs in and then fails every
    data call with code 1019. 0.1.5+ takes base_url on the constructor; 0.1.4
    read the module globals above.
    """
    for name, path in _ENDPOINT_GLOBALS.items():
        if hasattr(client_module, name):
            setattr(client_module, name, f"{COROS_API_BASE}{path}")

    if "base_url" in inspect.signature(client_cls).parameters:
        return client_cls(COROS_EMAIL, COROS_PASSWORD, base_url=COROS_API_BASE)
    return client_cls(COROS_EMAIL, COROS_PASSWORD)


def _hosts_in_use(client, client_module) -> list[str]:
    """Every URL the built client will actually call, for the region check."""
    values = [getattr(client, a) for a in _ENDPOINT_ATTRS if isinstance(getattr(client, a, None), str)]
    if values:
        return values
    return [
        getattr(client_module, n)
        for n in _ENDPOINT_GLOBALS
        if isinstance(getattr(client_module, n, None), str)
    ]


def _check_region(client, client_module) -> None:
    """Fail loudly if the client is not pointed at COROS_API_BASE.

    A silently-ignored region setting is the failure mode this guard exists for:
    corosexport 0.1.5 dropped the module globals 0.1.4 exposed, so the old
    rebinding kept "succeeding" while every sync died at code 1019.
    """
    stray = [url for url in _hosts_in_use(client, client_module) if not url.startswith(COROS_API_BASE)]
    if stray:
        raise RuntimeError(
            f"corosexport is calling {stray[0]} instead of COROS_API_BASE "
            f"({COROS_API_BASE}); this corosexport build exposes no region knob "
            "this adapter understands — pin the dependency or update _make_client"
        )


def explain_failure(exc: BaseException) -> str:
    """A plain-language reason plus the fix, for the sync log and the UI."""
    text = str(exc)
    other = EU_HOST if COROS_API_BASE.rstrip("/") == US_HOST else US_HOST
    if "1019" in text or "Access token is invalid" in text:
        return (
            f"COROS accepted the login but rejected the session token at "
            f"{COROS_API_BASE} (code 1019). That host is the wrong region for "
            f"this account — set COROS_API_BASE={other} in .env, restart the "
            "backend, and sync again."
        )
    if "Auth failed" in text or "Login" in text:
        return f"COROS rejected the login ({text}) — check COROS_EMAIL and COROS_PASSWORD in .env."
    if "Network error" in text or "timed out" in text or "Connection" in text:
        return (
            f"Could not reach COROS at {COROS_API_BASE} ({text}) — check the "
            "network, then sync again."
        )
    return f"COROS fetch failed: {text}"


def _authenticated_client():
    import corosexport.client as client_module

    client = _make_client(client_module.CorosClient, client_module)
    _check_region(client, client_module)
    client.authenticate()
    return client


def fetch_new(fit_dir: Path, limit: int = 200) -> int:
    """Download FIT files for runs not already in fit_dir. Returns download count."""
    from corosexport.models import ActivityType, ExportFormat

    run_types = {ActivityType.RUNNING, ActivityType.TRAIL_RUNNING}
    client = _authenticated_client()

    downloaded = 0
    for activity in client.get_activities(limit=limit):
        if activity.activity_type not in run_types:
            continue
        target = fit_dir / f"{activity.activity_id}.fit"
        if target.exists():
            continue
        ok = client.download_activity_file(
            activity.activity_id,
            activity.activity_type,
            ExportFormat.FIT,
            str(target),
        )
        if ok:
            downloaded += 1
        else:
            logger.warning("download failed for activity %s", activity.activity_id)
    return downloaded
