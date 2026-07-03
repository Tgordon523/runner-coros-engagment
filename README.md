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

Backend tests: `docker compose exec backend sh -c "cd /app && python -m pytest tests"`

## Roadmap

| Phase | Status | Delivers |
|-------|--------|----------|
| 1 — Skeleton | ✅ done | Docker compose, FastAPI + SQLite schema, React/MapLibre map shell |
| 2 — Ingestion | ✅ done | COROS fetcher, FIT parser, `POST /api/sync` |
| 3 — Runs API + filters | ✅ done | Period / Day / Effort / Distance / Time-of-day / Sport filtering behind Store + RunFilter |
| 4 — Map views | ✅ done | Heatmap, HR/pace gradient trails, aligned-start timelapse |
| 5 — Dashboard | 🔜 in progress | Charts + goal card + settings UI (backend `/api/dashboard` + `/api/settings` already shipped) |
| 6 — Art export | planned | Privacy-zone trim, MP4 render of timelapse |

Post-v1 backlog: chronological timelapse mode, effort distribution chart, poster grid,
elevation gradient trails, calendar feature, race-training goals.

### Phase 1 — Skeleton ✅

Docker compose (`backend` FastAPI :8000, `frontend` Vite :5173, hot reload via bind
mounts, `data/` volume), SQLite schema created on startup, React + MapLibre dark
basemap shell.

macOS note (OrbStack/Docker Desktop): the app must have Files-and-Folders permission
for the folder holding this repo, or bind mounts fail with "Operation not permitted".

### Phase 2 — Ingestion ✅

- **Fetcher** (`ingest/fetcher.py`): wraps `corosexport` using `COROS_EMAIL` /
  `COROS_PASSWORD` from `.env`, downloading run FIT files into `data/fit/`. Unofficial
  API (ADR 0001); failures land in `sync_log` and never block ingest. Fallback:
  unzip an official Training Hub bulk export into the same folder.
- **Parser** (`ingest/parser.py`): `fitdecode` → `ParsedRun`; pure
  `derive.summarize` derives local date, day-of-week, time-of-day, and pace.
  Idempotent by filename — re-drops and bulk zips are safe.
- **API**: `POST /api/sync`, `GET /api/sync/status`; sync also runs on startup.

### Phase 3 — Runs API + filters ✅

- **Store** (`store.py`): every SQL statement behind one interface; `:memory:`
  adapter in tests. **Effort is computed at read time** from avg HR and the current
  max-HR setting — adjusting max HR re-buckets all history.
- **RunFilter** (`filters.py`): the one place the shared filter params (Period
  presets `7d/30d/90d/ytd/year-YYYY/all` + custom dates, Day, Effort, Distance,
  Time-of-day, Sport — comma multi-select) become a WHERE clause.
- **Endpoints**: `GET /api/runs`, `/api/runs/{id}/track`, `/api/tracks`, `/api/meta`.

### Phase 4 — Map views ✅

Three deck.gl modes over the MapLibre dark basemap, all fed by one shared tracks
fetch (`useFilters`):

- **Heatmap** — alpha-stacked cyan paths; repetition builds brightness.
- **Trails** — segments colored by HR or pace (sequential single-hue ramps,
  brighter = harder/faster).
- **Timelapse** — aligned-start playback: every run's t=0 together, trails branch
  outward and accumulate; play/pause/scrub, 10–600× speed. Time mapping is
  pluggable for the future chronological mode.

`/api/tracks` enforces a `max_points` budget; decimation (every-Nth, endpoints
kept) is store implementation. Filter panel + Sync button with last-sync status.

### Phase 5 — Dashboard (in progress)

Backend shipped: `GET /api/dashboard` — one payload from `store.dashboard(filter)`
(weekly mileage buckets, pace trend with rolling mean, Goal projection from pure
`goal.py`); `GET/PUT /api/settings` (annual goal miles, max HR). Weekly + pace
respect the active filters; **Goal status always covers the whole calendar year**.

Remaining: chart components (weekly bars, cumulative vs required-pace, pace trend),
goal card, settings UI.

### Phase 6 — Art export (planned)

Privacy Zones (radius around saved locations, trimmed on exports only) and MP4
render of the timelapse. Privacy trim will be a pure `tracks -> tracks` function so
the safety rule is testable without rendering video.

## Data & privacy

Everything under `data/` is personal (GPS tracks reveal home/work locations) and is
gitignored along with `.env` credentials. Exported art (MP4s) also contains location
data — the planned privacy-zone feature trims points near saved locations on exports.
