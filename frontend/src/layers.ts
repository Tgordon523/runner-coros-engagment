/** deck.gl layer construction for the three map modes.
 *
 * Colors: brightness carries magnitude on the dark basemap; sequential
 * single-hue ramps per metric (no rainbow), dim slate for missing values.
 */

import { LineLayer, PathLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import type { Layer } from "@deck.gl/core";
import type { GradientMetric, LayerMode, Track } from "./types";

type RGB = [number, number, number];

const HEAT: RGB = [34, 211, 238]; // cyan, alpha-stacked for density
const TRAIL: RGB = [52, 211, 153]; // emerald timelapse trail
const MISSING: RGB = [100, 116, 139]; // slate for null metric values

// sequential ramps, dark -> bright (bright = more)
const HR_RAMP: [RGB, RGB] = [[80, 20, 20], [252, 165, 165]];
const PACE_RAMP: [RGB, RGB] = [[69, 26, 3], [251, 191, 36]];

function lerp(ramp: [RGB, RGB], v: number): RGB {
  const [a, b] = ramp;
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * v)) as RGB;
}

interface Segment {
  s: [number, number];
  t: [number, number];
  v: number | null; // normalized 0..1, null when metric missing
}

function toSegments(tracks: Track[], metric: GradientMetric): Segment[] {
  const idx = metric === "hr" ? 3 : 4;
  let min = Infinity;
  let max = -Infinity;
  for (const tr of tracks)
    for (const p of tr.points) {
      const v = p[idx];
      if (v != null) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  const span = max - min || 1;
  const segments: Segment[] = [];
  for (const tr of tracks)
    for (let i = 1; i < tr.points.length; i++) {
      const a = tr.points[i - 1];
      const b = tr.points[i];
      const raw = b[idx];
      let v: number | null = null;
      if (raw != null) {
        v = (raw - min) / span;
        if (metric === "pace") v = 1 - v; // faster = brighter
      }
      segments.push({ s: [a[0], a[1]], t: [b[0], b[1]], v });
    }
  return segments;
}

export function buildLayers(
  tracks: Track[],
  mode: LayerMode,
  metric: GradientMetric,
  currentTime: number
): Layer[] {
  if (!tracks.length) return [];

  if (mode === "heatmap") {
    return [
      new PathLayer<Track>({
        id: "heatmap",
        data: tracks,
        getPath: (t) => t.points.flatMap((p) => [p[0], p[1]]),
        positionFormat: "XY",
        getColor: [...HEAT, 45],
        widthMinPixels: 2,
        jointRounded: true,
        capRounded: true,
      }),
    ];
  }

  if (mode === "gradient") {
    return [
      new LineLayer<Segment>({
        id: "gradient",
        data: toSegments(tracks, metric),
        getSourcePosition: (d) => d.s,
        getTargetPosition: (d) => d.t,
        getColor: (d) => (d.v == null ? [...MISSING, 120] : [...lerp(metric === "hr" ? HR_RAMP : PACE_RAMP, d.v), 200]),
        widthMinPixels: 2,
        updateTriggers: { getColor: metric },
      }),
    ];
  }

  // timelapse: aligned-start — every run's t=0 is the animation's t=0, so
  // trails branch outward simultaneously. Time mapping stays pluggable here
  // for the future chronological mode.
  return [
    new TripsLayer<Track>({
      id: "timelapse",
      data: tracks,
      getPath: (t) => t.points.flatMap((p) => [p[0], p[1]]),
      positionFormat: "XY",
      getTimestamps: (t) => t.points.map((p) => p[2]),
      getColor: TRAIL,
      currentTime,
      trailLength: 1e9, // cumulative: trails persist, network grows
      fadeTrail: false,
      widthMinPixels: 2,
      jointRounded: true,
      capRounded: true,
    }),
  ];
}

export function maxDuration(tracks: Track[]): number {
  let max = 0;
  for (const t of tracks) {
    const last = t.points[t.points.length - 1];
    if (last && last[2] > max) max = last[2];
  }
  return max;
}

export function bounds(
  tracks: Track[]
): [[number, number], [number, number]] | null {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const t of tracks)
    for (const p of t.points) {
      if (p[0] < minLon) minLon = p[0];
      if (p[0] > maxLon) maxLon = p[0];
      if (p[1] < minLat) minLat = p[1];
      if (p[1] > maxLat) maxLat = p[1];
    }
  if (minLon === Infinity) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
