/** Zone bucketing for trail colors — the pure seam between /api/meta's zone
 * config and the gradient layer. HR buckets are Effort (backend effort.py is
 * the source of truth; the bounds arrive via meta, never hardcoded here).
 * Pace buckets come from the user's three threshold paces (CONTEXT.md
 * "Pace Zone"). Zone index 0 = easy … 3 = max, for both metrics.
 */

import { fmtPace } from "./charts/common";
import type { TrackPoint } from "./trackpoint";
import { hr, paceSPerMi } from "./trackpoint";
import type { GradientMetric } from "./types";

export { fmtPace };

export interface ZoneConfig {
  maxHr: number;
  effortBoundsPct: number[]; // ascending fractions of max HR
  paceBoundsSPerMi: number[]; // ascending s/mi thresholds; [] = unconfigured
}

export const ZONE_COUNT = 4;

export function hrZone(hrBpm: number, cfg: ZoneConfig): number {
  const i = cfg.effortBoundsPct.findIndex((pct) => hrBpm < pct * cfg.maxHr);
  return i === -1 ? ZONE_COUNT - 1 : i;
}

/** Faster pace (lower s/mi) = higher zone; null until thresholds are set. */
export function paceZone(pace: number, cfg: ZoneConfig): number | null {
  const b = cfg.paceBoundsSPerMi;
  if (b.length !== 3) return null;
  const i = b.findIndex((t) => pace < t);
  return i === -1 ? 0 : ZONE_COUNT - 1 - i;
}

export function pointZone(
  p: TrackPoint,
  metric: GradientMetric,
  cfg: ZoneConfig
): number | null {
  if (metric === "hr") {
    const v = hr(p);
    return v == null ? null : hrZone(v, cfg);
  }
  const v = paceSPerMi(p);
  return v == null ? null : paceZone(v, cfg);
}

/** Legend range text per zone (easy→max), or null when pace is unconfigured. */
export function zoneRanges(
  metric: GradientMetric,
  cfg: ZoneConfig
): string[] | null {
  if (metric === "hr") {
    const b = cfg.effortBoundsPct.map((pct) => Math.round(pct * cfg.maxHr));
    return [`< ${b[0]}`, `${b[0]}–${b[1] - 1}`, `${b[1]}–${b[2] - 1}`, `≥ ${b[2]}`];
  }
  const b = cfg.paceBoundsSPerMi;
  if (b.length !== 3) return null;
  return [
    `≥ ${fmtPace(b[2])}`,
    `${fmtPace(b[1])}–${fmtPace(b[2])}`,
    `${fmtPace(b[0])}–${fmtPace(b[1])}`,
    `< ${fmtPace(b[0])}`,
  ];
}
