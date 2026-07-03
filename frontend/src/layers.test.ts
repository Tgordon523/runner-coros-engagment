import { describe, expect, it } from "vitest";
import { bounds, buildLayers, maxDuration } from "./layers";
import type { Track, TrackPoint } from "./types";

function track(points: TrackPoint[], run_id = 1): Track {
  return { run_id, started_at: "2026-06-01T12:00:00Z", distance_mi: 5, effort: "easy", points };
}

const PTS: TrackPoint[] = [
  [-87.63, 41.88, 0, 120, 500],
  [-87.62, 41.89, 60, 150, 480],
  [-87.61, 41.9, 120, null, null],
];

describe("bounds / maxDuration", () => {
  it("bounds spans all points; null when empty", () => {
    expect(bounds([track(PTS)])).toEqual([
      [-87.63, 41.88],
      [-87.61, 41.9],
    ]);
    expect(bounds([])).toBeNull();
    expect(bounds([track([])])).toBeNull();
  });

  it("maxDuration is the largest final t_offset across runs", () => {
    expect(maxDuration([track(PTS), track([[-87.6, 41.8, 300, null, null]], 2)])).toBe(300);
    expect(maxDuration([])).toBe(0);
  });
});

describe("buildLayers — gradient segments through the public interface", () => {
  it("builds one segment per consecutive point pair, null metric dimmed", () => {
    const [layer] = buildLayers([track(PTS)], "gradient", "hr", 0);
    const segments = (layer.props as unknown as { data: unknown[] }).data;
    expect(segments).toHaveLength(2);
    const getColor = (layer.props as unknown as { getColor: (d: unknown) => number[] }).getColor;
    const colored = getColor(segments[0]);
    const missing = getColor(segments[1]); // second segment ends on null HR
    expect(missing).toEqual([100, 116, 139, 120]);
    expect(colored).not.toEqual(missing);
  });

  it("returns no layers for no tracks", () => {
    expect(buildLayers([], "heatmap", "hr", 0)).toEqual([]);
  });

  it("timelapse layer carries currentTime and per-point timestamps", () => {
    const [layer] = buildLayers([track(PTS)], "timelapse", "hr", 42);
    const props = layer.props as unknown as {
      currentTime: number;
      getTimestamps: (t: Track) => number[];
    };
    expect(props.currentTime).toBe(42);
    expect(props.getTimestamps(track(PTS))).toEqual([0, 60, 120]);
  });
});
