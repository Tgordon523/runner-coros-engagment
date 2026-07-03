from fastapi import APIRouter, Depends

from ..deps import get_store
from ..filters import RunFilter, run_filter
from ..store import Store

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard(
    f: RunFilter = Depends(run_filter), store: Store = Depends(get_store)
) -> dict:
    return store.dashboard(f)
