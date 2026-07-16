"""Download new FIT files from COROS Training Hub into the FIT folder.

Uses corosexport's unofficial API (see docs/adr/0001). Everything downstream
depends only on the folder contents, never on this module.
"""

import logging
from pathlib import Path

import corosexport.client
from corosexport.client import CorosClient
from corosexport.models import ActivityType, ExportFormat

from ..config import COROS_API_BASE, COROS_EMAIL, COROS_PASSWORD

logger = logging.getLogger(__name__)

# corosexport 0.1.4 hardcodes the EU host; rebind its endpoints to the
# account's home region or every data call fails with code 1019.
corosexport.client.COROS_BASE_URL = COROS_API_BASE
corosexport.client.AUTH_ENDPOINT = f"{COROS_API_BASE}/account/login"
corosexport.client.ACTIVITIES_ENDPOINT = f"{COROS_API_BASE}/activity/query"
corosexport.client.DOWNLOAD_ENDPOINT = f"{COROS_API_BASE}/activity/detail/download"

RUN_TYPES = {ActivityType.RUNNING, ActivityType.TRAIL_RUNNING}


def credentials_configured() -> bool:
    return bool(COROS_EMAIL and COROS_PASSWORD)


def fetch_new(fit_dir: Path, limit: int = 200) -> int:
    """Download FIT files for runs not already in fit_dir. Returns download count."""
    client = CorosClient(COROS_EMAIL, COROS_PASSWORD)
    client.authenticate()

    downloaded = 0
    for activity in client.get_activities(limit=limit):
        if activity.activity_type not in RUN_TYPES:
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
