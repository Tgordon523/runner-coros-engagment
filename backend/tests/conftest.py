import pytest

from app.ingest.derive import RunRow
from app.store import Store


def make_run(
    fit_filename="a.fit",
    local_date="2026-06-15",
    day_of_week=0,
    time_of_day="morning",
    sport="running",
    distance_mi=5.0,
    effort="easy",
    avg_hr=120,
) -> RunRow:
    return RunRow(
        fit_filename=fit_filename,
        started_at=f"{local_date}T11:00:00+00:00",
        local_date=local_date,
        day_of_week=day_of_week,
        time_of_day=time_of_day,
        sport=sport,
        distance_mi=distance_mi,
        duration_s=int(distance_mi * 480),
        avg_pace_s_per_mi=480.0,
        avg_hr=avg_hr,
        effort=effort,
    )


@pytest.fixture
def store() -> Store:
    return Store(":memory:")
