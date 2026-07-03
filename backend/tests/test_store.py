from app.filters import RunFilter
from app.ingest.parser import TrackPoint
from conftest import make_run


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
    store.add_run(make_run("a.fit", effort="easy", day_of_week=0, distance_mi=3), [])
    store.add_run(make_run("b.fit", effort="hard", day_of_week=6, distance_mi=13), [])
    store.add_run(make_run("c.fit", effort="hard", day_of_week=6, distance_mi=6,
                           local_date="2025-03-01"), [])

    assert len(store.runs(RunFilter(efforts=["hard"]))) == 2
    assert len(store.runs(RunFilter(efforts=["hard"], min_mi=10))) == 1
    assert len(store.runs(RunFilter(days=[6]))) == 2
    from datetime import date
    assert len(store.runs(RunFilter(start=date(2026, 1, 1)))) == 2


def test_tracks_shape(store):
    store.add_run(make_run("a.fit"), [_pt(0), _pt(1), _pt(2)])
    tracks = store.tracks(RunFilter())
    assert len(tracks) == 1
    t = tracks[0]
    assert t["effort"] == "easy"
    assert len(t["points"]) == 3
    lon, lat, t_off, hr, pace = t["points"][0]
    assert (lon, lat) == (-87.6, 41.9)


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
