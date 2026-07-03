"""Parser test against a real FIT fixture.

Drop any real COROS FIT file at backend/tests/fixtures/sample.fit to enable.
(Real FIT files are personal data, so none is committed; test skips without one.)
"""

import sqlite3
from pathlib import Path

import pytest

from app.db import SCHEMA
from app.ingest.parser import ingest_file, parse_fit

FIXTURE = Path(__file__).parent / "fixtures" / "sample.fit"

pytestmark = pytest.mark.skipif(not FIXTURE.exists(), reason="no FIT fixture present")


def test_parse_fit_basics():
    run = parse_fit(FIXTURE)
    assert run is not None
    assert run.distance_mi > 0
    assert run.duration_s > 0
    assert run.points, "expected GPS track points"
    p = run.points[0]
    assert -90 <= p.lat <= 90 and -180 <= p.lon <= 180
    assert run.points == sorted(run.points, key=lambda p: p.t_offset_s)


def test_ingest_idempotent():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    assert ingest_file(conn, FIXTURE) is True
    assert ingest_file(conn, FIXTURE) is False
    assert conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0] == 1
    n_points = conn.execute("SELECT COUNT(*) FROM track_points").fetchone()[0]
    assert n_points > 0
