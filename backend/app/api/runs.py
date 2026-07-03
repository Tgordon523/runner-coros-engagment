from fastapi import APIRouter, Depends, HTTPException

from ..deps import get_store
from ..filters import RunFilter, run_filter
from ..store import Store

router = APIRouter(prefix="/api", tags=["runs"])


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
    f: RunFilter = Depends(run_filter), store: Store = Depends(get_store)
) -> list[dict]:
    return store.tracks(f)
