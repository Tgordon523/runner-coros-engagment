/** deck.gl layer construction for the three map modes.
 *
 * Colors: the gradient layer buckets each Track Point into a discrete zone —
 * HR by Effort, pace by the user's Pace Zones (CONTEXT.md) — with dim slate
 * for missing values. Bright hues are deliberate: the basemap is dark.
 */

import { LineLayer, PathLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import type { Layer } from "@deck.gl/core";
import type { Timeline } from "./timeline";
import { lat, lon } from "./trackpoint";
import type { GradientMetric, LayerMode, Track } from "./types";
import { pointZone, type ZoneConfig } from "./zones";

type RGB = [number, number, number];

const HEAT: RGB = [34, 211, 238]; // cyan, alpha-stacked for density
const TRAIL: RGB = [52, 211, 153]; // emerald timelapse trail
const MISSING: RGB = [100, 116, 139]; // slate for null metric values

// easy → max; CVD-separated and ≥3:1 against the dark basemap (validated)
export const ZONE_COLORS: RGB[] = [
  [52, 211, 153], // easy — emerald
  [250, 204, 21], // moderate — yellow
  [251, 146, 60], // hard — orange
  [248, 113, 113], // max — red
];

interface Segment {
  s: [number, number];
  t: [number, number];
  z: number | null; // zone index (0=easy … 3=max), null when unbucketable
}

function toSegments(
  tracks: Track[],
  metric: GradientMetric,
  zones: ZoneConfig
): Segment[] {
  const segments: Segment[] = [];
  for (const tr of tracks)
    for (let i = 1; i < tr.points.length; i++) {
      const a = tr.points[i - 1];
      const b = tr.points[i];
      segments.push({
        s: [lon(a), lat(a)],
        t: [lon(b), lat(b)],
        z: pointZone(b, metric, zones),
      });
    }
  return segments;
}

export function buildLayers(
  tracks: Track[],
  mode: LayerMode,
  metric: GradientMetric,
  currentTime: number,
  timeline: Timeline,
  zones: ZoneConfig
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
        data: toSegments(tracks, metric, zones),
        getSourcePosition: (d) => d.s,
        getTargetPosition: (d) => d.t,
        getColor: (d) => (d.z == null ? [...MISSING, 120] : [...ZONE_COLORS[d.z], 200]),
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
