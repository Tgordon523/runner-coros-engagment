"""Parser tests against a FIT fixture.

The fit_file fixture defaults to a synthetic activity (synthfit.py); drop a
real COROS export at backend/tests/fixtures/sample.fit to test against that
instead. The generic tests hold for either; the exact-value test always
decodes the synthetic file.
"""

import pytest

from app.ingest.derive import summarize
from app.ingest.parser import parse_fit
from synthfit import AVG_HR, INTERVAL_S, N_POINTS, SPEED_M_S, write_synthetic_fit


def test_parse_fit_basics(fit_file):
    run = parse_fit(fit_file)
    assert run is not None
    assert run.distance_mi > 0
    assert run.duration_s > 0
    assert run.points, "expected GPS track points"
    p = run.points[0]
    assert -90 <= p.lat <= 90 and -180 <= p.lon <= 180
    assert run.points == sorted(run.points, key=lambda p: p.t_offset_s)


def test_ingest_idempotent(fit_file, store):
    parsed = parse_fit(fit_file)
    row = summarize(parsed, fit_file.name)
    assert store.add_run(row, parsed.points) is True
    assert store.add_run(row, parsed.points) is False


def test_parse_fit_synthetic_values(tmp_path):
    """Exact decode contract: what synthfit writes is what parse_fit reads."""
    run = parse_fit(write_synthetic_fit(tmp_path / "sample.fit"))
    assert run.sport == "running"
    assert run.duration_s == N_POINTS * INTERVAL_S
    assert run.distance_mi * 1609.344 == pytest.approx(SPEED_M_S * N_POINTS * INTERVAL_S)
    assert run.avg_hr == AVG_HR
    assert len(run.points) == N_POINTS
    first, last = run.points[0], run.points[-1]
    assert first.t_offset_s == 0.0
    assert last.t_offset_s == (N_POINTS - 1) * INTERVAL_S
    assert (first.lat, first.lon) == (0.0, 0.0)
    assert first.pace_s_per_mi == 1609.344 / SPEED_M_S
