"""Parser test against a real FIT fixture.

Drop any real COROS FIT file at backend/tests/fixtures/sample.fit to enable.
(Real FIT files are personal data, so none is committed; test skips without one.)
"""

from pathlib import Path

import pytest

from app.ingest.derive import summarize
from app.ingest.parser import parse_fit
from app.store import Store

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
    store = Store(":memory:")
    parsed = parse_fit(FIXTURE)
    row = summarize(parsed, FIXTURE.name)
    assert store.add_run(row, parsed.points) is True
    assert store.add_run(row, parsed.points) is False
