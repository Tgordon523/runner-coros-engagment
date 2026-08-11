import type { WeekBucket } from "../types";
import ChartFrame from "./ChartFrame";
import { INK_MUTED, PAD, SERIES_1, fmtDate } from "./common";
import { linePath, milesDomain } from "./frame";

export default function CumulativeMileage({ weeks }: { weeks: WeekBucket[] }) {
  if (weeks.length < 2) return null;

  const { ticks, domain } = milesDomain(weeks[weeks.length - 1].cumulative_mi || 1);

  return (
    <div className="chart">
      <h3>Cumulative miles</h3>
      <ChartFrame
        count={weeks.length}
        domain={domain}
        ticks={ticks}
        xMode="point"
        startDate={weeks[0].week_start}
        endDate={weeks[weeks.length - 1].week_start}
        marks={(s, hover) => (
          <>
            <path
              d={linePath(weeks.length, (i) => [s.x(i), s.y(weeks[i].cumulative_mi)])}
              fill="none"
              stroke={SERIES_1}
              strokeWidth={2}
            />
            {hover != null && (
              <g>
                <line
                  x1={s.x(hover)} x2={s.x(hover)} y1={PAD.top} y2={PAD.top + s.plotH}
                  stroke={INK_MUTED} strokeDasharray="3 3"
                />
                <circle
                  cx={s.x(hover)} cy={s.y(weeks[hover].cumulative_mi)}
                  r={4} fill={SERIES_1} stroke="#0f172a" strokeWidth={2}
                />
              </g>
            )}
          </>
        )}
        tooltip={(i) => (
          <>
            wk of {fmtDate(weeks[i].week_start)} · {weeks[i].cumulative_mi.toFixed(0)} mi total
          </>
        )}
      />
    </div>
  );
}
