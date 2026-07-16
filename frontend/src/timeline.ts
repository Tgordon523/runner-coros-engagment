/** The Timelapse timeline: when each Track Point lights up and how long the
 * animation runs. Both modes (see CONTEXT.md — Timelapse) are adapters behind
 * buildTimeline; layers, playback, and the recorder never do time math.
 *
 * - aligned: every run's t=0 is the animation's t=0, trails branch outward
 *   simultaneously.
 * - chronological: runs draw in date order, each starting as the previous
 *   finishes.
 */

import { tOffsetS } from "./trackpoint";
import type { Track } from "./types";

export type TimelineMode = "aligned" | "chronological";

/** Seconds the clock runs past the last point before wrapping around. */
export const TAIL_PADDING_S = 60;

export interface Timeline {
  mode: TimelineMode;
  /** Animation seconds until the last point lights up. */
  duration: number;
  /** Pause after `duration` before playback wraps. */
  tailPadding: number;
  /** Per-point animation times for one track, in points order. */
  timestamps: (t: Track) => number[];
}

function lastOffset(t: Track): number {
  const last = t.points[t.points.length - 1];
  return last ? tOffsetS(last) : 0;
}

/** One clock tick: step the clock `step` seconds forward, wrapping through
 * the tail padding. `atEnd` is true when the unwrapped clock reached
 * `duration` — the record-one-full-loop boundary. A single tick can jump from
 * before the end to past the wrap; `atEnd` still reports the crossing. */
export function advance(
  time: number,
  step: number,
  tl: Pick<Timeline, "duration" | "tailPadding">
): { time: number; atEnd: boolean } {
  if (!tl.duration) return { time: 0, atEnd: false };
  const next = time + step;
  return {
    time: next % (tl.duration + tl.tailPadding),
    atEnd: next >= tl.duration,
  };
}

export function buildTimeline(tracks: Track[], mode: TimelineMode): Timeline {
  const starts = new Map<number, number>();
  let duration = 0;
  if (mode === "aligned") {
    for (const t of tracks) duration = Math.max(duration, lastOffset(t));
  } else {
    const ordered = [...tracks].sort((a, b) =>
      a.started_at.localeCompare(b.started_at)
    );
    for (const t of ordered) {
      starts.set(t.run_id, duration);
      duration += lastOffset(t);
    }
  }
  return {
    mode,
    duration,
    tailPadding: TAIL_PADDING_S,
    timestamps: (t) => {
      const start = starts.get(t.run_id) ?? 0;
      return t.points.map((p) => start + tOffsetS(p));
    },
  };
}
