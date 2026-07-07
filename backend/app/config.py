import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", "../data")).resolve()
FIT_DIR = DATA_DIR / "fit"
DB_PATH = DATA_DIR / "app.db"

DEFAULT_MAX_HR = 190
MAX_HR = int(os.environ.get("MAX_HR", DEFAULT_MAX_HR))
DEFAULT_ANNUAL_GOAL_MI = 0  # user sets in app; 0 = unset

COROS_EMAIL = os.environ.get("COROS_EMAIL", "")
COROS_PASSWORD = os.environ.get("COROS_PASSWORD", "")
LOCAL_TZ = os.environ.get("LOCAL_TZ", "America/Chicago")
