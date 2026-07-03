from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import dashboard, runs, settings
from app.store import Store
from conftest import HR, make_run


def make_client() -> tuple[TestClient, Store]:
    app = FastAPI()
    app.include_router(runs.router)
    app.include_router(dashboard.router)
    app.include_router(settings.router)
    app.state.store = Store(":memory:")
    return TestClient(app), app.state.store


def test_settings_roundtrip_rebuckets_effort():
    client, store = make_client()
    store.add_run(make_run("a.fit", avg_hr=150), [])  # 150/190 -> moderate

    assert client.get("/api/settings").json() == {
        "annual_goal_mi": 0.0, "max_hr": 190,
    }
    r = client.put("/api/settings", json={"annual_goal_mi": 1000, "max_hr": 180})
    assert r.json() == {"annual_goal_mi": 1000.0, "max_hr": 180}
    # max HR change re-buckets through the API too
    assert client.get("/api/runs").json()[0]["effort"] == "hard"
    assert client.put("/api/settings", json={"max_hr": 999}).status_code == 422


def test_dashboard_endpoint():
    client, store = make_client()
    store.add_run(make_run("a.fit", distance_mi=10), [])
    d = client.get("/api/dashboard").json()
    assert set(d) == {"weekly", "pace_trend", "goal"}
    assert d["weekly"][0]["miles"] == 10
    assert d["goal"]["target_mi"] == 0


def test_runs_endpoint_filters():
    client, store = make_client()
    store.add_run(make_run("a.fit", avg_hr=HR["easy"]), [])
    store.add_run(make_run("b.fit", avg_hr=HR["hard"], day_of_week=6), [])

    assert len(client.get("/api/runs").json()) == 2
    assert len(client.get("/api/runs?effort=hard").json()) == 1
    assert len(client.get("/api/runs?effort=hard,easy&day=6").json()) == 1
    assert len(client.get("/api/runs?period=year-2026").json()) == 2
    assert len(client.get("/api/runs?period=year-2020").json()) == 0


def test_runs_endpoint_validation():
    client, _ = make_client()
    assert client.get("/api/runs?effort=sprint").status_code == 422
    assert client.get("/api/runs?period=fortnight").status_code == 422
    assert client.get("/api/runs?day=9").status_code == 422


def test_track_endpoints():
    client, store = make_client()
    from app.ingest.parser import TrackPoint

    pts = [TrackPoint(float(i), 41.9, -87.6, None, 140, 480.0) for i in range(3)]
    store.add_run(make_run("a.fit"), pts)
    run_id = client.get("/api/runs").json()[0]["id"]

    assert len(client.get(f"/api/runs/{run_id}/track").json()) == 3
    assert client.get("/api/runs/9999/track").status_code == 404

    tracks = client.get("/api/tracks?effort=easy").json()
    assert len(tracks) == 1
    assert len(tracks[0]["points"]) == 3
    assert client.get("/api/tracks?effort=hard").json() == []
