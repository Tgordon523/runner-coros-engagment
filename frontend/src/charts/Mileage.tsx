import { useState } from "react";
import type { DayBucket, WeekBucket } from "../types";
import { GRID, H, INK_MUTED, PAD, SERIES_1, W, fmtDate, svgX, yTicks } from "./common";

type Granularity = "weekly" | "daily";

interface Bar {
  date: string;
  miles: number;
  cumulative_mi: number;
}

export default function Mileage({ weeks, daily }: { weeks: WeekBucket[]; daily: DayBucket[] }) {
  const [gran, setGran] = useState<Granularity>("weekly");
  const [hover, setHover] = useState<number | null>(null);

  // weekly bars are calendar-continuous (gaps filled); daily bars are one
  // per Run Day, consecutive — rest days occupy no space (CONTEXT.md)
  const bars: Bar[] =
    gran === "weekly"
      ? weeks.map((w) => ({ date: w.week_start, miles: w.miles, cumulative_mi: w.cumulative_mi }))
      : daily;

  if (!bars.length) return <p className="empty">No runs in view.</p>;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxMi = Math.max(...bars.map((b) => b.miles), 1);
  const ticks = yTicks(maxMi);
  const yMax = ticks[ticks.length - 1] || maxMi;
  const slot = plotW / bars.length;
  // weekly keeps capped bars with a visible gap; daily renders flush,
  // histogram-style, whatever the count
  const barW =
    gran === "weekly" ? Math.min(Math.max(slot - 2, 1), 24) : Math.max(slot - 1, 0.5);
  const x = (i: number) => PAD.left + i * slot + (slot - barW) / 2;
  const y = (v: number) => PAD.top + plotH * (1 - v / yMax);

  const hovered = hover != null ? bars[hover] : null;

  const pick = (g: Granularity) => {
    setGran(g);
    setHover(null);
  };

  return (
    <div className="chart">
      <div className="chart-head">
        <h3>Mileage</h3>
        <div className="modes">
          {(["weekly", "daily"] as const).map((g) => (
            <button
              key={g}
              className={gran === g ? "mode on" : "mode"}
              onClick={() => pick(g)}
            >
              {g === "weekly" ? "Weekly" : "Daily"}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-body">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={(e) => {
            const i = Math.floor((svgX(e) - PAD.left) / slot);
            setHover(i >= 0 && i < bars.length ? i : null);
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
          {bars.map((b, i) => (
            <rect
              key={b.date}
              x={x(i)}
              y={y(b.miles)}
              width={barW}
              height={Math.max(plotH + PAD.top - y(b.miles), 0)}
              rx={gran === "weekly" ? 2 : 1}
              fill={SERIES_1}
              opacity={hover == null || hover === i ? 1 : 0.45}
            />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke={INK_MUTED} />
          <text x={PAD.left} y={H - 6} fontSize="10" fill={INK_MUTED}>
            {fmtDate(bars[0].date)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill={INK_MUTED}>
            {fmtDate(bars[bars.length - 1].date)}
          </text>
        </svg>
        {hovered && (
          <div className="tooltip">
            {gran === "weekly" ? "wk of " : ""}
            {fmtDate(hovered.date)} · {hovered.miles.toFixed(1)} mi ·{" "}
            {hovered.cumulative_mi.toFixed(0)} cum
          </div>
        )}
      </div>
    </div>
  );
}
