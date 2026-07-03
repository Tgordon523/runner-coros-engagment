import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", "../data")).resolve()
FIT_DIR = DATA_DIR / "fit"
DB_PATH = DATA_DIR / "app.db"

DEFAULT_MAX_HR = 190
DEFAULT_ANNUAL_GOAL_MI = 0  # user sets in app; 0 = unset

# Effort buckets as fraction of max HR (upper bound exclusive; see CONTEXT.md)
EFFORT_BUCKETS = [
    ("easy", 0.0, 0.70),
    ("moderate", 0.70, 0.80),
    ("hard", 0.80, 0.90),
    ("max", 0.90, 10.0),
]
