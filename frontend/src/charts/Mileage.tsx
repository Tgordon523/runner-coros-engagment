import { useState } from "react";
import type { DayBucket, WeekBucket } from "../types";
import ChartFrame from "./ChartFrame";
import { SERIES_1, fmtDate } from "./common";
import { milesDomain } from "./frame";

type Granularity = "weekly" | "daily";

interface Bar {
  date: string;
  miles: number;
  cumulative_mi: number;
}

export default function Mileage({ weeks, daily }: { weeks: WeekBucket[]; daily: DayBucket[] }) {
  const [gran, setGran] = useState<Granularity>("weekly");

  // weekly bars are calendar-continuous (gaps filled); daily bars are one
  // per Run Day, consecutive — rest days occupy no space (CONTEXT.md)
  const bars: Bar[] =
    gran === "weekly"
      ? weeks.map((w) => ({ date: w.week_start, miles: w.miles, cumulative_mi: w.cumulative_mi }))
      : daily;

  if (!bars.length) return <p className="empty">No runs in view.</p>;

  const { ticks, domain } = milesDomain(Math.max(...bars.map((b) => b.miles), 1));

  return (
    <div className="chart">
      <div className="chart-head">
        <h3>Mileage</h3>
        <div className="modes">
          {(["weekly", "daily"] as const).map((g) => (
            <button
              key={g}
              className={gran === g ? "mode on" : "mode"}
              onClick={() => setGran(g)}
            >
              {g === "weekly" ? "Weekly" : "Daily"}
            </button>
          ))}
        </div>
      </div>
      <ChartFrame
        count={bars.length}
        domain={domain}
        ticks={ticks}
        xMode="band"
        startDate={bars[0].date}
        endDate={bars[bars.length - 1].date}
        baseline
        marks={(s, hover) => {
          // weekly keeps capped bars with a visible gap; daily renders flush,
          // histogram-style, whatever the count
          const barW =
            gran === "weekly"
              ? Math.min(Math.max(s.slot - 2, 1), 24)
              : Math.max(s.slot - 1, 0.5);
          return bars.map((b, i) => (
            <rect
              key={b.date}
              x={s.x(i) - barW / 2}
              y={s.y(b.miles)}
              width={barW}
              height={Math.max(s.y(0) - s.y(b.miles), 0)}
              rx={gran === "weekly" ? 2 : 1}
              fill={SERIES_1}
              opacity={hover == null || hover === i ? 1 : 0.45}
            />
          ));
        }}
        tooltip={(i) => (
          <>
            {gran === "weekly" ? "wk of " : ""}
            {fmtDate(bars[i].date)} · {bars[i].miles.toFixed(1)} mi ·{" "}
            {bars[i].cumulative_mi.toFixed(0)} cum
          </>
        )}
      />
    </div>
  );
}
