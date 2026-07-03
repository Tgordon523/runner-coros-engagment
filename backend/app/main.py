import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import dashboard, runs, settings, sync
from .config import DB_PATH, FIT_DIR
from .ingest import service
from .store import Store

app = FastAPI(title="Run Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sync.router)
app.include_router(runs.router)
app.include_router(dashboard.router)
app.include_router(settings.router)


@app.on_event("startup")
def startup() -> None:
    FIT_DIR.mkdir(parents=True, exist_ok=True)
    app.state.store = Store(str(DB_PATH))
    threading.Thread(
        target=service.run_sync, args=(app.state.store,), daemon=True
    ).start()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
