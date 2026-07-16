import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", "../data")).resolve()
FIT_DIR = DATA_DIR / "fit"
DB_PATH = DATA_DIR / "app.db"

# Below this distance an activity is stored but is not a Run: it appears in
# no view, total, Goal, or Timelapse (CONTEXT.md "Run"). Read-time cutoff.
MIN_RUN_MI = 1.0

DEFAULT_MAX_HR = 190
MAX_HR = int(os.environ.get("MAX_HR", DEFAULT_MAX_HR))
DEFAULT_ANNUAL_GOAL_MI = 0  # user sets in app; 0 = unset

COROS_EMAIL = os.environ.get("COROS_EMAIL", "")
COROS_PASSWORD = os.environ.get("COROS_PASSWORD", "")
# Regional API host. corosexport hardcodes the EU host, but tokens are only
# honored by the account's home region (US accounts: teamapi.coros.com).
COROS_API_BASE = os.environ.get("COROS_API_BASE", "https://teamapi.coros.com")
LOCAL_TZ = os.environ.get("LOCAL_TZ", "America/Chicago")
