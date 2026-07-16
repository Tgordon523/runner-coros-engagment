/** Shared chart tokens and helpers. Palette validated with the dataviz
 * six-checks script against the dark surface. */

export const SERIES_1 = "#199e70"; // aqua — primary series
export const SERIES_2 = "#c98500"; // yellow — secondary series
export const REFERENCE = "#64748b"; // neutral reference lines (not a series)
export const GRID = "#1e293b";
export const INK_MUTED = "#64748b";

export const W = 640;
export const H = 200;
export const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

export function yTicks(max: number, n = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  // The last tick must reach max — charts use it as yMax, so stopping
  // short would clip data above the top gridline.
  const out: number[] = [];
  for (let v = 0; ; v += step) {
    out.push(v);
    if (v >= max - 1e-9) break;
  }
  return out;
}

export function fmtPace(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Mouse event -> x position in viewBox coordinates. */
export function svgX(e: React.MouseEvent<SVGSVGElement>): number {
  const rect = e.currentTarget.getBoundingClientRect();
  return ((e.clientX - rect.left) / rect.width) * W;
}
