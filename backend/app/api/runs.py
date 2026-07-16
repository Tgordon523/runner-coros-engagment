from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import get_store
from ..filters import RunFilter, run_filter
from ..privacy import apply_privacy_zones, apply_start_zones
from ..store import Store

router = APIRouter(prefix="/api", tags=["runs"])


@router.get("/meta")
def meta(store: Store = Depends(get_store)) -> dict:
    return store.meta()


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
        result = apply_privacy_zones(result, store.privacy_zones())
        if store.start_zone_enabled():
            result = apply_start_zones(result)
    return result
