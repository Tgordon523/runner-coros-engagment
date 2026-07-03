import pytest

from app.ingest.derive import RunRow
from app.store import Store


# avg_hr values that land in each Effort bucket at max HR 190
HR = {"easy": 120, "moderate": 140, "hard": 160, "max": 175}


def make_run(
    fit_filename="a.fit",
    local_date="2026-06-15",
    day_of_week=0,
    time_of_day="morning",
    sport="running",
    distance_mi=5.0,
    avg_hr=HR["easy"],
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
    )


@pytest.fixture
def store() -> Store:
    return Store(":memory:")
