/** Turns a sync status (or a failed request) into the banner the sidebar shows.
 *
 * Pure on purpose: the panel only renders what this returns. A sync can fail in
 * three places — the browser can't reach the API, the API can't reach COROS, or
 * COROS refuses the account — and each needs a different next step from the
 * user, so each gets its own headline and hint. */

import type { SyncStatus } from "./types";

export type SyncTone = "ok" | "warn" | "error";

export interface SyncNote {
  tone: SyncTone;
  headline: string;
  /** The machine's own words: server error text or HTTP failure. */
  detail?: string;
  /** What the user should do next. */
  hint?: string;
  /** Age of the last sync that actually reached COROS, when data may be stale. */
  stale?: string;
}

/** Coarse age, e.g. "just now", "14m ago", "3h ago", "13d ago". */
export function formatAge(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const then = Date.parse(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((now.getTime() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

/** True once the last successful COROS fetch is old enough to call out. */
function staleness(status: SyncStatus, now: Date): string | undefined {
  const age = formatAge(status.last_ok_at, now);
  return age ? `last reached COROS ${age}` : "never reached COROS";
}

export function describeSync(
  status: SyncStatus | null,
  requestError?: string | null,
  now: Date = new Date(),
): SyncNote {
  if (requestError) {
    return {
      tone: "error",
      headline: "Can't reach the app's API",
      detail: requestError,
      hint: "The backend isn't answering. Start it with `make up`, then sync again.",
    };
  }
  if (!status) return { tone: "warn", headline: "Sync status unavailable" };

  switch (status.status) {
    case "never-run":
      return { tone: "warn", headline: "Never synced", hint: "Press Sync to download runs from COROS." };
    case "already-running":
      return { tone: "warn", headline: "A sync is already running", hint: "Give it a moment, then refresh." };
    case "running":
      return { tone: "warn", headline: "Sync in progress…" };
    case "ok":
      return {
        tone: "ok",
        headline: `Synced ${formatAge(status.finished_at, now) ?? "just now"}`,
        detail: `${status.new_runs ?? 0} new run${status.new_runs === 1 ? "" : "s"}`,
      };
    case "partial":
      return {
        tone: "warn",
        headline: "COROS download failed — ingested local files only",
        detail: status.error ?? undefined,
        hint: `${status.new_runs ?? 0} file(s) from data/fit were added, but no new runs came from the watch.`,
        stale: staleness(status, now),
      };
    default:
      return {
        tone: "error",
        headline: "Sync failed — runs may be out of date",
        detail: status.error ?? undefined,
        stale: staleness(status, now),
      };
  }
}
