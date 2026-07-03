# Implementation Plan

V1 scope and vocabulary: see [CONTEXT.md](../CONTEXT.md). Ingestion contract: see [ADR 0001](adr/0001-fit-files-on-disk-as-ingestion-contract.md).

## Architecture

```
COROS Training Hub ──(corosexport, unofficial)──► data/fit/*.fit   ◄── manual bulk-export zip (fallback)
                                                       │
                                              backend (FastAPI, Python)
                                              fitdecode ──► SQLite (data/app.db)
                                                       │  REST: /api/...
                                              frontend (Vite + React)
                                              deck.gl + MapLibre + charts
```

Docker compose: `backend` (:8000) and `frontend` (:5173), volumes for `data/`.
Units: miles everywhere. Single user.

## Data model (SQLite)

- `runs` — id, fit_filename (unique), started_at (UTC), local_date, day_of_week,
  time_of_day (morning/lunch/evening/night), sport, distance_mi, duration_s,
  avg_pace_s_per_mi, avg_hr, effort (easy/moderate/hard/max, from avg HR % of max HR 190:
  <70% / 70–80% / 80–90% / >90%).
- `track_points` — run_id, seq, t_offset_s, lat, lon, ele_m, hr, pace_s_per_mi.
- `settings` — key/value: annual goal miles (user-adjustable), max HR, privacy zones
  (lat, lon, radius_m), units.
- `sync_log` — started_at, finished_at, status, new_runs, error.

Ingest is idempotent: a FIT file already in `runs` (by filename hash) is skipped, so
re-dropping a bulk-export zip is safe.

## API surface

- `POST /api/sync` — run fetcher then ingest folder; `GET /api/sync/status` — last sync info.
- `GET /api/runs?period&day&effort&min_mi&max_mi&time_of_day&sport` — summaries.
  All map/chart endpoints accept the same filter params.
- `GET /api/runs/{id}/track` — track points.
- `GET /api/tracks` — filtered tracks for map layers (timelapse needs t_offset per point).
- `GET /api/stats/weekly` — weekly mileage + cumulative.
- `GET /api/stats/pace-trend` — per-run avg pace + rolling mean.
- `GET /api/stats/goal` — goal, YTD miles, required rate, projected year-end, on-track bool.
- `GET/PUT /api/settings` — goal, max HR, privacy zones.
- `POST /api/export/timelapse` — render MP4 (privacy zones applied).

## Phases

Each phase ends runnable. Commit per phase minimum.

### Phase 1 — Skeleton (scaffold)

Compose + backend app with health route + empty schema migration + frontend shell
rendering a MapLibre basemap. `make up` works.

### Phase 2 — Ingestion

- Fetcher: wrap `corosexport` (creds from env) writing `data/fit/`; never crash the app
  when the unofficial API fails — record failure in `sync_log`.
- Parser: fitdecode → `runs` + `track_points`, effort + time_of_day derivation.
- `POST /api/sync`, startup sync, status endpoint.
- Test: parse a real FIT file fixture; effort bucket unit tests at boundary HRs (133/152/171).

### Phase 3 — Runs API + filters

Filter param parsing (Period presets + custom, Day, Effort, Distance, Time-of-day, Sport),
runs list + tracks endpoints. Test: filter combinations against seeded DB.

### Phase 4 — Map views

Frontend filter panel wired to API. Layers, one toggle group:
1. Heatmap (all filtered runs overlaid, additive opacity).
2. Gradient trails (color by HR or pace along track).
3. Timelapse — deck.gl TripsLayer, aligned-start mode (every run's t=0 aligned),
   play/pause/speed. Chronological mode is backlog; keep the time-normalization
   function pluggable so it drops in later.

### Phase 5 — Dashboard

Weekly mileage bars + cumulative line; pace trend scatter + rolling mean;
goal card (adjustable annual miles, on-track projection). Settings UI for goal + max HR.

### Phase 6 — Art export

Privacy zone trim (exports only), MP4 render of timelapse (headless browser capture or
frame-by-frame canvas → ffmpeg), export button with progress.

## Backlog (post-v1)

Chronological timelapse mode · effort distribution chart · poster grid ·
elevation gradient trails · calendar feature · race-training goals.

## Risks

- **Unofficial API breaks** (expected eventually): mitigated by ADR 0001 — FIT folder is
  the contract; fallback is manual bulk export into the same folder.
- **corosexport unmaintained/broken**: fetcher is one small module; xballoy/coros-api
  (Node) is a drop-in alternative behind the same folder contract.
- **MP4 render complexity**: if headless capture fights back, ship WebM via MediaRecorder
  first (still shareable), ffmpeg-convert offline.
