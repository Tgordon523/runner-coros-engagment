import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import sync
from .config import FIT_DIR
from .db import init_db
from .ingest import service

app = FastAPI(title="Run Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sync.router)


@app.on_event("startup")
def startup() -> None:
    FIT_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    threading.Thread(target=service.run_sync, daemon=True).start()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
