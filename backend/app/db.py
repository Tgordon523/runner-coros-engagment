SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY,
    fit_filename TEXT NOT NULL UNIQUE,
    started_at TEXT NOT NULL,          -- UTC ISO 8601
    local_date TEXT NOT NULL,          -- YYYY-MM-DD
    day_of_week INTEGER NOT NULL,      -- 0=Monday
    time_of_day TEXT NOT NULL,         -- morning|lunch|evening|night
    sport TEXT NOT NULL,
    distance_mi REAL NOT NULL,
    duration_s INTEGER NOT NULL,
    avg_pace_s_per_mi REAL,
    avg_hr INTEGER,
    effort TEXT                        -- easy|moderate|hard|max, NULL if no HR
);

CREATE TABLE IF NOT EXISTS track_points (
    run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    t_offset_s REAL NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    ele_m REAL,
    hr INTEGER,
    pace_s_per_mi REAL,
    PRIMARY KEY (run_id, seq)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,              -- running|ok|error
    new_runs INTEGER DEFAULT 0,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_local_date ON runs(local_date);
"""
