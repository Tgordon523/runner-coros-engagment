# Run Tracker

Map and run tracker for a COROS Pace 3 runner: filterable run history, mileage/goal
dashboards, and map art (branching-trail timelapse, heatmap, HR/pace gradient trails).

- Vocabulary: [CONTEXT.md](CONTEXT.md)
- Full plan (all 6 phases): [docs/PLAN.md](docs/PLAN.md)
- Why FIT-files-on-disk is the ingestion contract: [ADR 0001](docs/adr/0001-fit-files-on-disk-as-ingestion-contract.md)

## Quickstart

```sh
cp .env.example .env   # fill in COROS credentials
make up
```

- Frontend: http://localhost:5173
- API: http://localhost:8000/api/health

## Roadmap

| Phase | Status | Delivers |
|-------|--------|----------|
| 1 — Skeleton | ✅ done | Docker compose, FastAPI + SQLite schema, React/MapLibre map shell |
| 2 — Ingestion | 🔜 next | COROS fetcher, FIT parser, `POST /api/sync` |
| 3 — Runs API + filters | planned | Period / Day / Effort / Distance / Time-of-day / Sport filtering |
| 4 — Map views | planned | Heatmap, HR/pace gradient trails, aligned-start timelapse |
| 5 — Dashboard | planned | Weekly mileage + cumulative, pace trend, adjustable annual goal with on-track projection |
| 6 — Art export | planned | Privacy-zone trim, MP4 render of timelapse |

Post-v1 backlog: chronological timelapse mode, effort distribution chart, poster grid,
elevation gradient trails, calendar feature, race-training goals.

### Phase 1 — Skeleton (done)

Runnable end-to-end shell.

- **Docker compose** with two services: `backend` (FastAPI on :8000) and `frontend`
  (Vite dev server on :5173). Code is volume-mounted for hot reload; `data/` is
  volume-mounted into the backend.
- **Backend** (`backend/app/`): FastAPI app with `GET /api/health`; SQLite database
  created on startup at `data/app.db` with the full v1 schema (`runs`, `track_points`,
  `settings`, `sync_log` — see `backend/app/db.py`); effort-bucket thresholds in
  `backend/app/config.py` (avg HR as % of max HR 190: easy <70%, moderate 70–80%,
  hard 80–90%, max >90%).
- **Frontend** (`frontend/src/`): React + MapLibre dark basemap, deck.gl dependency in
  place for later map layers, small `api.ts` fetch helper.
- **`data/fit/`**: the ingestion contract folder — every FIT file here becomes a run,
  regardless of how it arrived.

macOS note (OrbStack/Docker Desktop): the app must have Files-and-Folders permission
for the folder holding this repo, or bind mounts fail with "Operation not permitted".

### Phase 2 — Ingestion (next)

Turns FIT files into queryable runs.

- **Fetcher**: wraps `corosexport` using `COROS_EMAIL`/`COROS_PASSWORD` from `.env` to
  download new FIT files from COROS Training Hub into `data/fit/`. Uses an unofficial
  API (see ADR 0001); failures are recorded in `sync_log`, never crash the app.
  Fallback: request an official bulk export from Training Hub and unzip it into
  `data/fit/` — nothing else changes.
- **Parser**: `fitdecode` reads each FIT file into `runs` (summary + derived effort
  bucket and time-of-day) and `track_points` (per-point time offset, lat/lon,
  elevation, HR, pace). Idempotent: files already ingested are skipped, so re-drops
  and bulk zips are safe.
- **API**: `POST /api/sync` (fetch then ingest), `GET /api/sync/status` (last sync
  time, result, new-run count). Sync also runs on backend startup.
- **Tests**: parser against a real FIT fixture; effort-bucket unit tests at boundary
  heart rates (133 / 152 / 171 bpm).

### Phase 3 — Runs API + filters

Filter param parsing shared by every map/chart endpoint: Period (presets + custom
range), Day of week, Effort, min/max Distance, Time-of-day, Sport type. Endpoints for
run summaries and filtered tracks.

### Phase 4 — Map views

Filter panel wired to the API, plus three deck.gl layer modes: route heatmap (additive
overlay), gradient trails colored by HR or pace, and the aligned-start timelapse —
every run's t=0 aligned so trails branch outward simultaneously (TripsLayer, with the
time-normalization pluggable so chronological mode can drop in later).

### Phase 5 — Dashboard

Weekly mileage bars + cumulative line; pace trend with rolling mean; goal card —
user-adjustable annual miles with on-track projection (current rate vs required rate,
projected year-end total). Settings UI for goal and max HR.

### Phase 6 — Art export

Privacy zones (radius around saved locations, trimmed on exports only) and MP4 render
of the timelapse for shareable art.

## Data & privacy

Everything under `data/` is personal (GPS tracks reveal home/work locations) and is
gitignored along with `.env` credentials. Exported art (MP4s) also contains location
data — the planned privacy-zone feature trims points near saved locations on exports.
