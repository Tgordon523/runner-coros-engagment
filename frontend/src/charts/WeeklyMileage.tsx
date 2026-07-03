import { useState } from "react";
import type { WeekBucket } from "../types";
import { GRID, H, INK_MUTED, PAD, SERIES_1, W, fmtDate, svgX, yTicks } from "./common";

export default function WeeklyMileage({ weeks }: { weeks: WeekBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!weeks.length) return <p className="empty">No runs in view.</p>;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxMi = Math.max(...weeks.map((w) => w.miles), 1);
  const ticks = yTicks(maxMi);
  const yMax = ticks[ticks.length - 1] || maxMi;
  const slot = plotW / weeks.length;
  const barW = Math.min(Math.max(slot - 2, 1), 24); // 2px surface gap between bars
  const x = (i: number) => PAD.left + i * slot + (slot - barW) / 2;
  const y = (v: number) => PAD.top + plotH * (1 - v / yMax);

  const hovered = hover != null ? weeks[hover] : null;

  return (
    <div className="chart">
      <h3>Weekly mileage</h3>
      <div className="chart-body">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={(e) => {
            const i = Math.floor((svgX(e) - PAD.left) / slot);
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
          {weeks.map((w, i) => (
            <rect
              key={w.week_start}
              x={x(i)}
              y={y(w.miles)}
              width={barW}
              height={Math.max(plotH + PAD.top - y(w.miles), 0)}
              rx={2}
              fill={SERIES_1}
              opacity={hover == null || hover === i ? 1 : 0.45}
            />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke={INK_MUTED} />
          <text x={PAD.left} y={H - 6} fontSize="10" fill={INK_MUTED}>
            {fmtDate(weeks[0].week_start)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill={INK_MUTED}>
            {fmtDate(weeks[weeks.length - 1].week_start)}
          </text>
        </svg>
        {hovered && (
          <div className="tooltip">
            wk of {fmtDate(hovered.week_start)} · {hovered.miles.toFixed(1)} mi ·{" "}
            {hovered.cumulative_mi.toFixed(0)} cum
          </div>
        )}
      </div>
    </div>
  );
}
