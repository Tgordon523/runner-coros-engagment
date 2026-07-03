# 0001 — FIT files on disk as the ingestion contract

## Status

Accepted (2026-07-01)

## Context

COROS offers no official public API for individual users. The available paths for getting run data off a COROS Pace 3 are:

- **A.** Unofficial tools ([corosexport](https://pypi.org/project/corosexport/), [xballoy/coros-api](https://github.com/xballoy/coros-api)) that call the COROS Training Hub's non-public API. Automatic and fresh, but could break whenever COROS changes their backend.
- **B.** Official Training Hub bulk export — a manually requested zip of FIT/TCX files. Stable but manual and stale.
- **C.** COROS → Strava auto-sync, then the official Strava API. Stable OAuth, but rate-limited and Strava strips some fields.

## Decision

Use path A (unofficial Training Hub API) as the primary fetcher, with path B as backfill and fallback. Crucially, the ingestion contract for everything downstream is **FIT files in a local folder** — not any API. The fetcher's only job is to populate that folder.

## Consequences

- If the unofficial API breaks, we drop an official bulk-export zip into the same folder and nothing downstream changes.
- All parsing, storage, and visualization code depends only on the FIT format, which is an open, stable standard.
- We accept that automatic fetching may silently break; the folder-based design makes recovery a manual re-export rather than a rewrite.
