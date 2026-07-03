import { useState } from "react";
import type { PacePoint } from "../types";
import { GRID, H, INK_MUTED, PAD, SERIES_1, SERIES_2, W, fmtDate, fmtPace, svgX } from "./common";

/** Y axis inverted: faster (lower s/mi) sits higher. */
export default function PaceTrend({ trend }: { trend: PacePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!trend.length) return <p className="empty">No paced runs in view.</p>;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const paces = trend.flatMap((t) => [t.pace_s_per_mi, t.rolling_pace_s_per_mi]);
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  const span = max - min || 60;
  const lo = min - span * 0.1;
  const hi = max + span * 0.1;
  const x = (i: number) =>
    PAD.left + (trend.length === 1 ? plotW / 2 : (plotW * i) / (trend.length - 1));
  const y = (v: number) => PAD.top + plotH * ((v - lo) / (hi - lo));

  const rolling = trend
    .map((t, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(t.rolling_pace_s_per_mi).toFixed(1)}`)
    .join("");

  // ~4 pace gridlines on the inverted axis
  const step = Math.max(30, Math.round(span / 3 / 30) * 30);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  const hovered = hover != null ? trend[hover] : null;

  return (
    <div className="chart">
      <h3>Pace trend</h3>
      <div className="chart-body">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={(e) => {
            const i = Math.round(((svgX(e) - PAD.left) / plotW) * (trend.length - 1));
            setHover(i >= 0 && i < trend.length ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
              <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={INK_MUTED}>
                {fmtPace(t)}
              </text>
            </g>
          ))}
          {trend.map((t, i) => (
            <circle
              key={t.run_id}
              cx={x(i)}
              cy={y(t.pace_s_per_mi)}
              r={hover === i ? 5 : 3.5}
              fill={SERIES_2}
              stroke="#0f172a"
              strokeWidth={1}
            />
          ))}
          <path d={rolling} fill="none" stroke={SERIES_1} strokeWidth={2} />
          <text x={PAD.left} y={H - 6} fontSize="10" fill={INK_MUTED}>
            {fmtDate(trend[0].local_date)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill={INK_MUTED}>
            {fmtDate(trend[trend.length - 1].local_date)}
          </text>
        </svg>
        {hovered && (
          <div className="tooltip">
            {fmtDate(hovered.local_date)} · {fmtPace(hovered.pace_s_per_mi)}/mi ·{" "}
            {hovered.distance_mi.toFixed(1)} mi · 5-run avg {fmtPace(hovered.rolling_pace_s_per_mi)}
          </div>
        )}
      </div>
      <div className="legend">
        <span><i className="swatch" style={{ background: SERIES_2 }} /> Runs</span>
        <span><i className="swatch" style={{ background: SERIES_1 }} /> 5-run average</span>
      </div>
    </div>
  );
}
