from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from ..ingest import service

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("")
async def trigger_sync() -> dict:
    return await run_in_threadpool(service.run_sync)


@router.get("/status")
def sync_status() -> dict:
    last = service.last_sync()
    return last or {"status": "never-run"}
