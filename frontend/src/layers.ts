/** deck.gl layer construction for the three map modes.
 *
 * Colors: brightness carries magnitude on the dark basemap; sequential
 * single-hue ramps per metric (no rainbow), dim slate for missing values.
 */

import { LineLayer, PathLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import type { Layer } from "@deck.gl/core";
import type { Timeline } from "./timeline";
import { lat, lon, metricValue } from "./trackpoint";
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
  let min = Infinity;
  let max = -Infinity;
  for (const tr of tracks)
    for (const p of tr.points) {
      const v = metricValue(p, metric);
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
      const raw = metricValue(b, metric);
      let v: number | null = null;
      if (raw != null) {
        v = (raw - min) / span;
        if (metric === "pace") v = 1 - v; // faster = brighter
      }
      segments.push({ s: [lon(a), lat(a)], t: [lon(b), lat(b)], v });
    }
  return segments;
}

export function buildLayers(
  tracks: Track[],
  mode: LayerMode,
  metric: GradientMetric,
  currentTime: number,
  timeline: Timeline
): Layer[] {
  if (!tracks.length) return [];

  if (mode === "heatmap") {
    return [
      new PathLayer<Track>({
        id: "heatmap",
        data: tracks,
        getPath: (t) => t.points.flatMap((p) => [lon(p), lat(p)]),
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

  // timelapse: the timeline owns all time mapping (aligned vs chronological);
  // this layer just renders whatever timestamps it hands out.
  return [
    new TripsLayer<Track>({
      id: "timelapse",
      data: tracks,
      getPath: (t) => t.points.flatMap((p) => [lon(p), lat(p)]),
      positionFormat: "XY",
      getTimestamps: timeline.timestamps,
      getColor: TRAIL,
      currentTime,
      trailLength: 1e9, // cumulative: trails persist, network grows
      fadeTrail: false,
      widthMinPixels: 2,
      jointRounded: true,
      capRounded: true,
      updateTriggers: { getTimestamps: timeline.mode },
    }),
  ];
}

export function bounds(
  tracks: Track[]
): [[number, number], [number, number]] | null {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const t of tracks)
    for (const p of t.points) {
      if (lon(p) < minLon) minLon = lon(p);
      if (lon(p) > maxLon) maxLon = lon(p);
      if (lat(p) < minLat) minLat = lat(p);
      if (lat(p) > maxLat) maxLat = lat(p);
    }
  if (minLon === Infinity) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
