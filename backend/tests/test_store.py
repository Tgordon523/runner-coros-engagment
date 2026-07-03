from datetime import date

from app.filters import RunFilter
from app.ingest.parser import TrackPoint
from conftest import HR, make_run


def _pt(seq: int) -> TrackPoint:
    return TrackPoint(
        t_offset_s=float(seq), lat=41.9, lon=-87.6, ele_m=180.0, hr=140,
        pace_s_per_mi=480.0,
    )


def test_add_run_idempotent(store):
    assert store.add_run(make_run(), [_pt(0), _pt(1)]) is True
    assert store.add_run(make_run(), [_pt(0)]) is False
    assert len(store.runs(RunFilter())) == 1


def test_runs_filtering(store):
    store.add_run(make_run("a.fit", avg_hr=HR["easy"], day_of_week=0, distance_mi=3), [])
    store.add_run(make_run("b.fit", avg_hr=HR["hard"], day_of_week=6, distance_mi=13), [])
    store.add_run(make_run("c.fit", avg_hr=HR["hard"], day_of_week=6, distance_mi=6,
                           local_date="2025-03-01"), [])

    assert len(store.runs(RunFilter(efforts=["hard"]))) == 2
    assert len(store.runs(RunFilter(efforts=["hard"], min_mi=10))) == 1
    assert len(store.runs(RunFilter(days=[6]))) == 2
    assert len(store.runs(RunFilter(start=date(2026, 1, 1)))) == 2


def test_effort_boundaries_at_default_max_hr(store):
    # max HR 190: 70% = 133, 80% = 152, 90% = 171 (lower bound inclusive)
    for i, (hr, expected) in enumerate(
        [(132, "easy"), (133, "moderate"), (151, "moderate"), (152, "hard"),
         (170, "hard"), (171, "max"), (190, "max"), (None, None)]
    ):
        store.add_run(make_run(f"{i}.fit", avg_hr=hr), [])
    by_file = {r["fit_filename"]: r["effort"] for r in store.runs(RunFilter())}
    assert by_file == {
        "0.fit": "easy", "1.fit": "moderate", "2.fit": "moderate", "3.fit": "hard",
        "4.fit": "hard", "5.fit": "max", "6.fit": "max", "7.fit": None,
    }


def test_changing_max_hr_rebuckets_history(store):
    store.add_run(make_run("a.fit", avg_hr=150), [])
    assert store.runs(RunFilter())[0]["effort"] == "moderate"  # 150/190 = 79%

    store.set_setting("max_hr", "180")
    assert store.runs(RunFilter())[0]["effort"] == "hard"  # 150/180 = 83%
    assert len(store.runs(RunFilter(efforts=["moderate"]))) == 0
    assert len(store.runs(RunFilter(efforts=["hard"]))) == 1


def test_tracks_shape(store):
    store.add_run(make_run("a.fit"), [_pt(0), _pt(1), _pt(2)])
    tracks = store.tracks(RunFilter())
    assert len(tracks) == 1
    t = tracks[0]
    assert t["effort"] == "easy"
    assert len(t["points"]) == 3
    lon, lat, t_off, hr, pace = t["points"][0]
    assert (lon, lat) == (-87.6, 41.9)


def test_tracks_decimation_budget(store):
    store.add_run(make_run("a.fit"), [_pt(i) for i in range(100)])
    store.add_run(make_run("b.fit", local_date="2026-06-16"), [_pt(i) for i in range(100)])

    full = store.tracks(RunFilter())
    assert sum(len(t["points"]) for t in full) == 200

    budget = store.tracks(RunFilter(), max_points=20)
    for t in budget:
        assert len(t["points"]) <= 12  # stride 10 -> 10 points + kept endpoint
        assert t["points"][-1][2] == 99.0  # last point survives decimation


def test_meta(store):
    assert store.meta() == {
        "sports": [], "first_date": None, "last_date": None, "run_count": 0,
    }
    store.add_run(make_run("a.fit", sport="running", local_date="2026-01-05"), [])
    store.add_run(make_run("b.fit", sport="running/trail", local_date="2026-06-15"), [])
    m = store.meta()
    assert m["sports"] == ["running", "running/trail"]
    assert m["first_date"] == "2026-01-05"
    assert m["last_date"] == "2026-06-15"
    assert m["run_count"] == 2


def test_run_track_and_missing(store):
    store.add_run(make_run("a.fit"), [_pt(0)])
    run_id = store.runs(RunFilter())[0]["id"]
    assert store.run_track(run_id)[0]["lat"] == 41.9
    assert store.run_track(9999) is None


def test_sync_log_roundtrip(store):
    sync_id = store.sync_started()
    assert store.last_sync()["status"] == "running"
    store.sync_finished(sync_id, "ok", 3, None)
    last = store.last_sync()
    assert last["status"] == "ok"
    assert last["new_runs"] == 3
