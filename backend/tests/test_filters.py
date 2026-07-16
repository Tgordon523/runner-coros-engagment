from datetime import date

import pytest
from fastapi import HTTPException

from app.config import MIN_RUN_MI
from app.filters import RunFilter, resolve_period, run_filter


def test_empty_filter_still_applies_run_floor():
    where, params = RunFilter().where()
    assert where == "distance_mi >= ?"
    assert params == [MIN_RUN_MI]


def test_where_combines_all_conditions():
    f = RunFilter(
        start=date(2026, 1, 1),
        end=date(2026, 6, 30),
        days=[5, 6],
        efforts=["easy", "moderate"],
        times_of_day=["morning"],
        sports=["running"],
        min_mi=3,
        max_mi=10,
    )
    where, params = f.where()
    assert where.count(" AND ") == 8
    assert "day_of_week IN (?,?)" in where
    assert params == [
        MIN_RUN_MI, "2026-01-01", "2026-06-30", 5, 6, "easy", "moderate",
        "morning", "running", 3, 10,
    ]


def test_resolve_period_presets():
    start, end = resolve_period("year-2025", None, None)
    assert (start, end) == (date(2025, 1, 1), date(2025, 12, 31))
    assert resolve_period("all", None, None) == (None, None)
    assert resolve_period(None, None, None) == (None, None)
    start, end = resolve_period("7d", None, None)
    assert (end - start).days == 6


def test_explicit_dates_beat_preset():
    start, end = resolve_period("30d", date(2026, 2, 1), None)
    assert (start, end) == (date(2026, 2, 1), None)


def test_bad_period_rejected():
    with pytest.raises(HTTPException):
        resolve_period("fortnight", None, None)


def test_run_filter_dependency_parses_csv():
    f = run_filter(day="5,6", effort="easy", time_of_day=None, sport="running")
    assert f.days == [5, 6]
    assert f.efforts == ["easy"]
    assert f.sports == ["running"]


def test_run_filter_rejects_unknown_effort():
    with pytest.raises(HTTPException) as e:
        run_filter(effort="sprint")
    assert e.value.status_code == 422


def test_run_filter_rejects_bad_day():
    with pytest.raises(HTTPException):
        run_filter(day="7")
    with pytest.raises(HTTPException):
        run_filter(day="mon")
