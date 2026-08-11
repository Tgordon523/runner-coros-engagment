/** Pure geometry for the shared chart frame: index/value scales and the
 * mouse→index mapping. ChartFrame renders with these; frame.test.ts
 * exercises them directly. */

import { H, PAD, W, yTicks } from "./common";

/** "band": each index owns a slot (bars); "point": indices spread across the
 * full plot width, endpoints at the edges (lines, dots). */
export type XMode = "band" | "point";

export interface Scales {
  /** index -> x center of its band / point */
  x: (i: number) => number;
  /** value -> y; domain[0] renders at the bottom, domain[1] at the top */
  y: (v: number) => number;
  /** band width ("band") or point spacing ("point") */
  slot: number;
  plotW: number;
  plotH: number;
}

export function makeScales(
  count: number,
  domain: [number, number],
  xMode: XMode
): Scales {
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const [bottom, top] = domain;
  const span = top - bottom || 1;
  const slot =
    xMode === "band" ? plotW / count : count > 1 ? plotW / (count - 1) : plotW;
  const x =
    xMode === "band"
      ? (i: number) => PAD.left + i * slot + slot / 2
      : (i: number) => (count === 1 ? PAD.left + plotW / 2 : PAD.left + i * slot);
  const y = (v: number) => PAD.top + plotH * (1 - (v - bottom) / span);
  return { x, y, slot, plotW, plotH };
}

/** Gridline ticks for a 0-based miles axis plus the [0, top] domain they
 * imply: the top tick is the domain top, so no mark can overflow the
 * highest gridline. */
export function milesDomain(maxMi: number): {
  ticks: number[];
  domain: [number, number];
} {
  const ticks = yTicks(maxMi);
  return { ticks, domain: [0, ticks[ticks.length - 1] || maxMi] };
}

/** SVG path through indexed points. */
export function linePath(
  count: number,
  pt: (i: number) => [number, number]
): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const [px, py] = pt(i);
    d += `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  return d;
}

/** viewBox x -> data index, or null outside the data. */
export function hoverIndex(
  svgXPos: number,
  count: number,
  xMode: XMode
): number | null {
  if (count === 0) return null;
  const plotW = W - PAD.left - PAD.right;
  const rel = svgXPos - PAD.left;
  const i =
    xMode === "band"
      ? Math.floor(rel / (plotW / count))
      : Math.round((rel / plotW) * (count - 1));
  return i >= 0 && i < count ? i : null;
}
