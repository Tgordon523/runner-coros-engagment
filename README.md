# Run Tracker

Map and run tracker for a COROS Pace 3 runner: filterable run history, mileage/goal
dashboards, and map art (timelapse — aligned-start or chronological — heatmap, and
HR/pace gradient trails).

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
Frontend tests: `docker compose exec frontend sh -c "cd /app && npm test"`

## Roadmap

| Phase | Status | Delivers |
|-------|--------|----------|
| 1 — Skeleton | ✅ done | Docker compose, FastAPI + SQLite schema, React/MapLibre map shell |
| 2 — Ingestion | ✅ done | COROS fetcher, FIT parser, `POST /api/sync` |
| 3 — Runs API + filters | ✅ done | Period / Day / Effort / Distance / Time-of-day / Sport filtering behind Store + RunFilter |
| 4 — Map views | ✅ done | Heatmap, HR/pace gradient trails, aligned-start timelapse |
| 5 — Dashboard | ✅ done | Weekly/cumulative/pace charts, goal card, settings UI over `/api/dashboard` + `/api/settings` |
| 6 — Art export | ✅ done | Privacy-zone trim, timelapse recording, MP4 download |

Post-v1 delivered so far: chronological timelapse mode (see below). Remaining
backlog: effort distribution chart, poster grid, elevation gradient trails,
calendar feature, race-training goals.

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
- **Timelapse** — animated playback with play/pause/scrub and 10–600× speed, in
  two timing modes behind the `timeline` module: aligned-start (every run's t=0
  together, trails branch outward and accumulate) and chronological (runs draw in
  date order, each starting as the previous finishes).

`/api/tracks` enforces a `max_points` budget; decimation (every-Nth, endpoints
kept) is store implementation. Filter panel + Sync button with last-sync status.

### Phase 5 — Dashboard ✅

- **Backend**: `GET /api/dashboard` — one payload from `store.dashboard(filter)`
  (weekly mileage buckets, pace trend with rolling mean, Goal projection from pure
  `goal.py`); `GET/PUT /api/settings` (annual goal miles, max HR — edits re-bucket
  Effort instantly). Weekly + pace respect the active filters; **Goal status always
  covers the whole calendar year**.
- **Frontend** (Dashboard tab): goal stat card with progress meter and
  where-you-should-be-today marker; weekly mileage bars, cumulative line, and pace
  trend (dots + 5-run rolling mean, faster-is-up axis) as hand-rolled SVG with hover
  tooltips and a collapsible data table; settings panel. Chart palette validated
  with the dataviz six-checks script against the dark surface.
- The Timelapse clock moved into `usePlayback` — Phase 6's frame-by-frame MP4
  renderer becomes its second caller.

### Phase 6 — Art export ✅

- **Privacy Zones**: pure `privacy.apply_privacy_zones(tracks, zones)` — the safety
  rule is tested with points and circles, never by watching video. Zones (lat, lon,
  radius) are edited in settings; `GET /api/tracks?privacy=1` returns trimmed
  tracks, the local map is never trimmed.
- **Recording**: in Timelapse mode, ⏺ Record plays one full loop in the selected
  timing mode and captures exactly what the map shows (composited basemap + trails via
  MediaRecorder) — the recorder is `usePlayback`'s second consumer, and the speed
  slider doubles as video-length control. An "apply privacy zones" toggle previews
  and records the trimmed tracks.
- **MP4**: the browser's WebM is transcoded by `POST /api/export/mp4` (ffmpeg in
  the backend image, h264 + faststart); if transcoding ever fails the WebM
  downloads instead, so an export always lands.

All six v1 phases are complete.

### Post-v1 — module deepening + chronological timelapse ✅

An architecture review deepened three modules; behavior is unchanged except one
new feature:

- **Timeline** (`frontend/src/timeline.ts`): all Timelapse timing —
  per-point timestamps, duration, and the pause before the playback wraps — lives
  behind `buildTimeline(tracks, mode)`. Aligned-start and the new
  **chronological mode** (a Timing selector in the Timelapse controls) are its two
  adapters; layers, the clock, and the recorder do no time math.
- **Effort** (`backend/app/effort.py`): the bucket thresholds, the valid-name
  set, and the SQL derivation live in one module with an import-time invariant
  check. `/api/meta` serves the bucket names, so the filter panel can never
  drift from the backend vocabulary.
- **Track Point wire layout** (`backend/app/trackpoint.py` +
  `frontend/src/trackpoint.ts`): the `[lon, lat, t_offset_s, hr, pace_s_per_mi]`
  tuple order is defined once per side of the HTTP seam; every consumer goes
  through named indices/accessors instead of hand-indexing.

## Data & privacy

Everything under `data/` is personal (GPS tracks reveal home/work locations) and is
gitignored along with `.env` credentials. Exported art (MP4s) also contains location
data — the planned privacy-zone feature trims points near saved locations on exports.
