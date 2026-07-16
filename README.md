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

Set `COROS_API_BASE` in `.env` to your account's home region — US
`https://teamapi.coros.com` (default) or EU `https://teameuapi.coros.com`;
tokens from the wrong region fail every data call.

- Frontend: http://localhost:5173
- API: http://localhost:8000/api/health

Backend tests: `docker compose exec backend sh -c "cd /app && python -m pytest tests"`
Frontend tests: `docker compose exec frontend sh -c "cd /app && npm test"`

Local dev without Docker also works:

```sh
cd backend && uv run uvicorn app.main:app --port 8000   # serves data/app.db
cd frontend && npm install && npm run dev               # http://localhost:5173
```

## Roadmap

| Phase | Status | Delivers |
|-------|--------|----------|
| 1 — Skeleton | ✅ done | Docker compose, FastAPI + SQLite schema, React/MapLibre map shell |
| 2 — Ingestion | ✅ done | COROS fetcher, FIT parser, `POST /api/sync` |
| 3 — Runs API + filters | ✅ done | Period / Day / Effort / Distance / Time-of-day / Sport filtering behind Store + RunFilter |
| 4 — Map views | ✅ done | Heatmap, HR/pace gradient trails, aligned-start timelapse |
| 5 — Dashboard | ✅ done | Weekly/cumulative/pace charts, goal card, settings UI over `/api/dashboard` + `/api/settings` |
| 6 — Art export | ✅ done | Privacy-zone trim, timelapse recording, MP4 download |

Post-v1 delivered so far: the 1-mile Run floor, zone-colored trails, the
Weekly | Daily mileage toggle, the Start Zone export trim, chronological
timelapse mode, and two rounds of module deepening (see below). Remaining
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
  `COROS_PASSWORD` from `.env`, downloading run FIT files into `data/fit/`. The
  library hardcodes the EU host, so the fetcher rebinds its endpoints to
  `COROS_API_BASE` (the account's home region) at import. Unofficial
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
  Time-of-day, Sport — comma multi-select) become a WHERE clause. The clause
  always starts with the Run floor: activities under `MIN_RUN_MI` (1 mi) are
  stored but are not Runs — no view, total, Goal, or Timelapse shows them.
- **Endpoints**: `GET /api/runs`, `/api/runs/{id}/track`, `/api/tracks`, `/api/meta`.

### Phase 4 — Map views ✅

Three deck.gl modes over the MapLibre dark basemap, all fed by one shared tracks
fetch (`useFilters`):

- **Heatmap** — alpha-stacked cyan paths; repetition builds brightness.
- **Trails** — each segment colored by its zone: HR buckets by Effort (the one
  HR bucketing, per Track Point here), pace by the user's three Pace Zone
  thresholds from settings; four discrete colors + slate for missing data, with
  an on-map legend (`zones.ts` is the pure bucketing seam).
- **Timelapse** — animated playback with play/pause/scrub and 10–600× speed, in
  two timing modes behind the `timeline` module: aligned-start (every run's t=0
  together, trails branch outward and accumulate) and chronological (runs draw in
  date order, each starting as the previous finishes).

`/api/tracks` enforces a `max_points` budget; decimation (every-Nth, endpoints
kept) is store implementation. Filter panel + Sync button with last-sync status.

### Phase 5 — Dashboard ✅

- **Backend**: `GET /api/dashboard` — one payload from `store.dashboard(filter)`
  (weekly + daily mileage buckets, pace trend with rolling mean, Goal projection
  from pure `goal.py`); `GET/PUT /api/settings` (annual goal miles, max HR, Pace
  Zone thresholds, Start Zone toggle — max-HR/pace-threshold edits re-bucket
  instantly). Charts respect the active filters; **Goal status always covers the
  whole calendar year**.
- **Frontend** (Dashboard tab): goal stat card with progress meter and
  where-you-should-be-today marker; mileage bars with a Weekly | Daily toggle
  (weekly is calendar-continuous and gap-filled; daily shows only Run Days,
  flush histogram-style bars), cumulative line, and pace trend (dots + 5-run
  rolling mean, faster-is-up axis) as hand-rolled SVG with hover tooltips and a
  collapsible data table. Chart palette validated
  with the dataviz six-checks script against the dark surface.
- **Settings** is its own top-level tab (Map | Dashboard | Settings): annual
  goal, max HR, Pace Zone thresholds (mm:ss input), Privacy Zones, and the
  Start Zone toggle.
- The Timelapse clock and recording now live together in `useTimelapse` — one
  module drives playback and knows when a recorded loop ends.

### Phase 6 — Art export ✅

- **Privacy Zones**: pure `privacy.apply_privacy_zones(tracks, zones)` — the safety
  rule is tested with points and circles, never by watching video. Zones (lat, lon,
  radius) are edited in settings; `GET /api/tracks?privacy=1` returns trimmed
  tracks, the local map is never trimmed.
- **Start Zone**: a settings toggle (independent of saved zones) that trims a
  400 m radius around each run's own start point on export — catching finishes
  that return near the start (`privacy.apply_start_zones`).
- **Recording**: in Timelapse mode, ⏺ Record plays one full loop in the selected
  timing mode and captures exactly what the map shows (composited basemap + trails via
  MediaRecorder) — the clock itself stops the recording at the loop end, and the
  speed slider doubles as video-length control. An "apply privacy zones" toggle
  previews and records the trimmed tracks.
- **MP4**: the browser's WebM is transcoded by `POST /api/export/mp4` (ffmpeg in
  the backend image, h264 + faststart); if transcoding ever fails the WebM
  downloads instead, so an export always lands.

All six v1 phases are complete.

### Post-v1 — module deepening + chronological timelapse ✅

Architecture reviews deepened four modules. Behavior is unchanged except the
chronological timing mode and one fix: recordings now stop exactly at the
loop end instead of racing the clock's wrap.

- **Timeline** (`frontend/src/timeline.ts`): all Timelapse timing —
  per-point timestamps, duration, and the pause before the playback wraps — lives
  behind `buildTimeline(tracks, mode)`. Aligned-start and the new
  **chronological mode** (a Timing selector in the Timelapse controls) are its two
  adapters; layers, the clock, and the recorder do no time math.
- **Effort** (`backend/app/effort.py`): the bucket thresholds, the valid-name
  set, and the SQL derivation live in one module with an import-time invariant
  check. `/api/meta` serves the bucket names and bounds plus the zone config
  (max HR, pace thresholds), so neither the filter panel nor the map's
  Track Point coloring can drift from the backend vocabulary.
- **Track Point wire layout** (`backend/app/trackpoint.py` +
  `frontend/src/trackpoint.ts`): the `[lon, lat, t_offset_s, hr, pace_s_per_mi]`
  tuple order is defined once per side of the HTTP seam; every consumer goes
  through named indices/accessors instead of hand-indexing.
- **Timelapse recording** (`frontend/src/useTimelapse.ts` + `recording.ts`):
  the clock, the record-one-full-loop rule, and frame capture collapsed into
  one module (replacing `usePlayback` + `useRecorder` + an App-level stop
  poll that could race the clock's wrap). `timeline.advance` is the only code
  that knows where the loop ends, and MapView hands its canvases across an
  explicit `CaptureSurface` instead of the recorder crawling its DOM.

## Data & privacy

Everything under `data/` is personal (GPS tracks reveal home/work locations) and is
gitignored along with `.env` credentials. Exported art (MP4s) also contains location
data — Privacy Zones trim points near saved locations on exports, and the Start
Zone toggle trims 400 m around each run's start.
