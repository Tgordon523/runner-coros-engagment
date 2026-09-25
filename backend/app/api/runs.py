from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from .. import effort
from ..deps import get_store
from ..filters import DAY_NAMES, PERIOD_PRESETS, RunFilter, run_filter
from ..ingest.derive import TIME_OF_DAY_NAMES
from ..privacy import apply_privacy_zones, apply_start_zones
from ..settings import setting
from ..store import Store
from ..trackpoint import WIRE_COLUMNS

router = APIRouter(prefix="/api", tags=["runs"])


def assemble_meta(store: Store) -> dict:
    stats = store.run_stats()
    return {
        **stats,
        "efforts": effort.NAMES,
        "times_of_day": TIME_OF_DAY_NAMES,
        "days": list(DAY_NAMES),
        "periods": [{"value": v, "label": l} for v, l in PERIOD_PRESETS],
        "track_point_columns": list(WIRE_COLUMNS),
        "max_hr": setting(store, "max_hr"),
        "effort_bounds_pct": effort.BOUNDS_PCT,
        "pace_zone_s_per_mi": setting(store, "pace_zone_s_per_mi"),
    }


@router.get("/meta")
def meta(store: Store = Depends(get_store)) -> dict:
    return assemble_meta(store)


@router.get("/runs")
def list_runs(
    f: RunFilter = Depends(run_filter), store: Store = Depends(get_store)
) -> list[dict]:
    return store.runs(f)


@router.get("/runs/{run_id}/track")
def run_track(run_id: int, store: Store = Depends(get_store)) -> list[dict]:
    track = store.run_track(run_id)
    if track is None:
        raise HTTPException(404, "no such run")
    return track


@router.get("/tracks")
def tracks(
    f: RunFilter = Depends(run_filter),
    max_points: Annotated[int, Query(ge=1_000, le=2_000_000)] = 150_000,
    privacy: bool = False,
    store: Store = Depends(get_store),
) -> list[dict]:
    result = store.tracks(f, max_points)
    if privacy:
        result = apply_privacy_zones(result, setting(store, "privacy_zones"))
        if setting(store, "start_zone_enabled"):
            result = apply_start_zones(result)
    return result
