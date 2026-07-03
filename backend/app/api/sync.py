from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from ..deps import get_store
from ..ingest import service
from ..store import Store

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("")
async def trigger_sync(store: Store = Depends(get_store)) -> dict:
    return await run_in_threadpool(service.run_sync, store)


@router.get("/status")
def sync_status(store: Store = Depends(get_store)) -> dict:
    return store.last_sync() or {"status": "never-run"}
