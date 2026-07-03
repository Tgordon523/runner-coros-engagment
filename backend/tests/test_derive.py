from datetime import datetime, timezone

from app.ingest.derive import pace_s_per_mi, summarize, time_of_day
from app.ingest.parser import ParsedRun

# Effort bucketing happens in the store at read time; boundaries are tested
# in test_store.py through the store's interface.


def test_time_of_day_buckets():
    assert time_of_day(5) == "morning"
    assert time_of_day(11) == "morning"
    assert time_of_day(12) == "lunch"
    assert time_of_day(13) == "lunch"
    assert time_of_day(14) == "evening"
    assert time_of_day(20) == "evening"
    assert time_of_day(21) == "night"
    assert time_of_day(4) == "night"


def test_pace():
    # 3.352 m/s ~ 8:00 min/mi
    assert abs(pace_s_per_mi(3.3528) - 480) < 1
    assert pace_s_per_mi(0) is None
    assert pace_s_per_mi(None) is None


def test_summarize_wiring():
    # 2026-01-10 23:30 UTC = Jan 10 17:30 in Chicago (UTC-6): evening, Saturday
    parsed = ParsedRun(
        started_at=datetime(2026, 1, 10, 23, 30, tzinfo=timezone.utc),
        sport="running",
        distance_mi=6.0,
        duration_s=2880,
        avg_hr=155,
    )
    row = summarize(parsed, "x.fit", local_tz="America/Chicago")
    assert row.local_date == "2026-01-10"
    assert row.day_of_week == 5  # Saturday
    assert row.time_of_day == "evening"
    assert row.avg_hr == 155
    assert row.avg_pace_s_per_mi == 480.0


def test_summarize_no_distance_no_hr():
    parsed = ParsedRun(
        started_at=datetime(2026, 1, 10, 12, 0, tzinfo=timezone.utc),
        sport="running",
        distance_mi=0.0,
        duration_s=600,
        avg_hr=None,
    )
    row = summarize(parsed, "x.fit", local_tz="UTC")
    assert row.avg_pace_s_per_mi is None
    assert row.time_of_day == "lunch"
