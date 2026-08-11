import type { PacePoint } from "../types";
import ChartFrame from "./ChartFrame";
import { SERIES_1, SERIES_2, fmtDate, fmtPace } from "./common";
import { linePath } from "./frame";

/** Y axis inverted: faster (lower s/mi) sits higher — a reversed domain. */
export default function PaceTrend({ trend }: { trend: PacePoint[] }) {
  if (!trend.length) return <p className="empty">No paced runs in view.</p>;

  const paces = trend.flatMap((t) => [t.pace_s_per_mi, t.rolling_pace_s_per_mi]);
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  const span = max - min || 60;
  const lo = min - span * 0.1;
  const hi = max + span * 0.1;

  // ~4 pace gridlines on the inverted axis
  const step = Math.max(30, Math.round(span / 3 / 30) * 30);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

  return (
    <div className="chart">
      <h3>Pace trend</h3>
      <ChartFrame
        count={trend.length}
        domain={[hi, lo]}
        ticks={ticks}
        fmtTick={fmtPace}
        xMode="point"
        startDate={trend[0].local_date}
        endDate={trend[trend.length - 1].local_date}
        marks={(s, hover) => (
          <>
            {trend.map((t, i) => (
              <circle
                key={t.run_id}
                cx={s.x(i)}
                cy={s.y(t.pace_s_per_mi)}
                r={hover === i ? 5 : 3.5}
                fill={SERIES_2}
                stroke="#0f172a"
                strokeWidth={1}
              />
            ))}
            <path
              d={linePath(trend.length, (i) => [s.x(i), s.y(trend[i].rolling_pace_s_per_mi)])}
              fill="none"
              stroke={SERIES_1}
              strokeWidth={2}
            />
          </>
        )}
        tooltip={(i) => (
          <>
            {fmtDate(trend[i].local_date)} · {fmtPace(trend[i].pace_s_per_mi)}/mi ·{" "}
            {trend[i].distance_mi.toFixed(1)} mi · 5-run avg{" "}
            {fmtPace(trend[i].rolling_pace_s_per_mi)}
          </>
        )}
      />
      <div className="legend">
        <span><i className="swatch" style={{ background: SERIES_2 }} /> Runs</span>
        <span><i className="swatch" style={{ background: SERIES_1 }} /> 5-run average</span>
      </div>
    </div>
  );
}
