/** The shared chart shell: one place owns the plot rect, gridlines and tick
 * labels, the first/last date labels, mouse→index hover, and the tooltip.
 * Charts pass only their marks (bars, dots, lines) and tooltip content —
 * they never touch PAD/W/H or mouse math. */

import { useState, type ReactNode } from "react";
import { GRID, H, INK_MUTED, PAD, W, fmtDate, svgX } from "./common";
import { hoverIndex, makeScales, type Scales, type XMode } from "./frame";

interface Props {
  /** number of data slots along x */
  count: number;
  /** [value at the bottom edge, value at the top edge] — an inverted axis
   * (pace: faster higher) is just a reversed domain */
  domain: [number, number];
  ticks: number[];
  fmtTick?: (v: number) => string;
  xMode: XMode;
  /** ISO dates rendered under the plot's left/right corners */
  startDate: string;
  endDate: string;
  /** solid axis line at domain[0] */
  baseline?: boolean;
  marks: (s: Scales, hover: number | null) => ReactNode;
  tooltip: (i: number) => ReactNode;
}

export default function ChartFrame({
  count,
  domain,
  ticks,
  fmtTick,
  xMode,
  startDate,
  endDate,
  baseline,
  marks,
  tooltip,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const s = makeScales(count, domain, xMode);
  // data can shrink under a stale hover (e.g. granularity switch)
  const hov = hover != null && hover < count ? hover : null;

  return (
    <div className="chart-body">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onMouseMove={(e) => setHover(hoverIndex(svgX(e), count, xMode))}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={s.y(t)} y2={s.y(t)} stroke={GRID} />
            <text x={PAD.left - 6} y={s.y(t) + 3} textAnchor="end" fontSize="10" fill={INK_MUTED}>
              {fmtTick ? fmtTick(t) : t}
            </text>
          </g>
        ))}
        {marks(s, hov)}
        {baseline && (
          <line
            x1={PAD.left} x2={W - PAD.right}
            y1={s.y(domain[0])} y2={s.y(domain[0])}
            stroke={INK_MUTED}
          />
        )}
        <text x={PAD.left} y={H - 6} fontSize="10" fill={INK_MUTED}>
          {fmtDate(startDate)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill={INK_MUTED}>
          {fmtDate(endDate)}
        </text>
      </svg>
      {hov != null && <div className="tooltip">{tooltip(hov)}</div>}
    </div>
  );
}
