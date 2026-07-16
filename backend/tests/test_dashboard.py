from app.dashboard import daily_mileage, pace_trend, weekly_mileage


def _run(id, local_date, distance_mi=5.0, pace=480.0):
    return {
        "id": id,
        "local_date": local_date,
        "distance_mi": distance_mi,
        "avg_pace_s_per_mi": pace,
    }


def test_weekly_buckets_and_gap_fill():
    runs = [
        _run(1, "2026-06-01", 3),  # Monday, week of Jun 1
        _run(2, "2026-06-07", 5),  # Sunday, same week
        _run(3, "2026-06-16", 10),  # week of Jun 15 — Jun 8 week is a gap
    ]
    weeks = weekly_mileage(runs)
    assert [w["week_start"] for w in weeks] == ["2026-06-01", "2026-06-08", "2026-06-15"]
    assert [w["miles"] for w in weeks] == [8, 0, 10]
    assert [w["cumulative_mi"] for w in weeks] == [8, 8, 18]


def test_weekly_empty():
    assert weekly_mileage([]) == []


def test_daily_sums_run_days_without_gap_fill():
    runs = [
        _run(1, "2026-06-01", 3),
        _run(2, "2026-06-01", 5),   # second run same day -> one bucket
        _run(3, "2026-06-16", 10),  # two-week gap occupies no space
    ]
    days = daily_mileage(runs)
    assert days == [
        {"date": "2026-06-01", "miles": 8, "cumulative_mi": 8},
        {"date": "2026-06-16", "miles": 10, "cumulative_mi": 18},
    ]


def test_daily_empty():
    assert daily_mileage([]) == []


def test_pace_trend_rolling_and_nulls():
    runs = [
        _run(1, "2026-06-01", pace=500),
        _run(2, "2026-06-02", pace=None),  # no pace -> excluded
        _run(3, "2026-06-03", pace=480),
        _run(4, "2026-06-04", pace=460),
    ]
    trend = pace_trend(runs, window=2)
    assert [t["run_id"] for t in trend] == [1, 3, 4]
    assert trend[0]["rolling_pace_s_per_mi"] == 500
    assert trend[1]["rolling_pace_s_per_mi"] == 490  # (500+480)/2
    assert trend[2]["rolling_pace_s_per_mi"] == 470  # (480+460)/2
