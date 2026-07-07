import { describe, expect, it } from "vitest";
import { buildTimeline, TAIL_PADDING_S } from "./timeline";
import type { Track, TrackPoint } from "./types";

function track(run_id: number, started_at: string, lastOffset: number): Track {
  const points: TrackPoint[] = [
    [-87.63, 41.88, 0, 120, 500],
    [-87.62, 41.89, lastOffset, 150, 480],
  ];
  return { run_id, started_at, distance_mi: 5, effort: "easy", points };
}

const EARLY = track(1, "2026-06-01T12:00:00Z", 120);
const LATE = track(2, "2026-06-08T12:00:00Z", 300);

describe("aligned timeline", () => {
  it("every run starts at t=0; duration is the longest run", () => {
    const tl = buildTimeline([LATE, EARLY], "aligned");
    expect(tl.timestamps(EARLY)).toEqual([0, 120]);
    expect(tl.timestamps(LATE)).toEqual([0, 300]);
    expect(tl.duration).toBe(300);
    expect(tl.tailPadding).toBe(TAIL_PADDING_S);
  });

  it("empty tracks yield zero duration", () => {
    expect(buildTimeline([], "aligned").duration).toBe(0);
    expect(buildTimeline([{ ...EARLY, points: [] }], "aligned").duration).toBe(0);
  });
});

describe("chronological timeline", () => {
  it("runs draw in date order, each starting as the previous finishes", () => {
    // pass out of date order: the timeline sorts by started_at
    const tl = buildTimeline([LATE, EARLY], "chronological");
    expect(tl.timestamps(EARLY)).toEqual([0, 120]);
    expect(tl.timestamps(LATE)).toEqual([120, 420]);
    expect(tl.duration).toBe(420);
  });
});
