import { useState } from "react";
import type { WeekBucket } from "../types";
import { GRID, H, INK_MUTED, PAD, SERIES_1, W, fmtDate, svgX, yTicks } from "./common";

export default function CumulativeMileage({ weeks }: { weeks: WeekBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (weeks.length < 2) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxMi = weeks[weeks.length - 1].cumulative_mi || 1;
  const ticks = yTicks(maxMi);
  const yMax = ticks[ticks.length - 1] || maxMi;
  const x = (i: number) => PAD.left + (plotW * i) / (weeks.length - 1);
  const y = (v: number) => PAD.top + plotH * (1 - v / yMax);
  const path = weeks
    .map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w.cumulative_mi).toFixed(1)}`)
    .join("");

  const hovered = hover != null ? weeks[hover] : null;

  return (
    <div className="chart">
      <h3>Cumulative miles</h3>
      <div className="chart-body">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={(e) => {
            const i = Math.round(((svgX(e) - PAD.left) / plotW) * (weeks.length - 1));
            setHover(i >= 0 && i < weeks.length ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
              <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={INK_MUTED}>
                {t}
              </text>
            </g>
          ))}
          <path d={path} fill="none" stroke={SERIES_1} strokeWidth={2} />
          {hovered && (
            <g>
              <line
                x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + plotH}
                stroke={INK_MUTED} strokeDasharray="3 3"
              />
              <circle cx={x(hover!)} cy={y(hovered.cumulative_mi)} r={4} fill={SERIES_1} stroke="#0f172a" strokeWidth={2} />
            </g>
          )}
          <text x={PAD.left} y={H - 6} fontSize="10" fill={INK_MUTED}>
            {fmtDate(weeks[0].week_start)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill={INK_MUTED}>
            {fmtDate(weeks[weeks.length - 1].week_start)}
          </text>
        </svg>
        {hovered && (
          <div className="tooltip">
            wk of {fmtDate(hovered.week_start)} · {hovered.cumulative_mi.toFixed(0)} mi total
          </div>
        )}
      </div>
    </div>
  );
}
