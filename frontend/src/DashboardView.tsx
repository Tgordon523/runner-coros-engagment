import GoalCard from "./GoalCard";
import SettingsPanel from "./SettingsPanel";
import CumulativeMileage from "./charts/CumulativeMileage";
import PaceTrend from "./charts/PaceTrend";
import WeeklyMileage from "./charts/WeeklyMileage";
import { fmtDate, fmtPace } from "./charts/common";
import type { Dashboard } from "./types";

interface Props {
  data: Dashboard | null;
  onSettingsSaved: () => void;
}

export default function DashboardView({ data, onSettingsSaved }: Props) {
  if (!data) return <p className="empty">Loading dashboard…</p>;

  return (
    <div className="dashboard">
      <div className="dash-row">
        <GoalCard goal={data.goal} />
        <SettingsPanel onSaved={onSettingsSaved} />
      </div>
      <WeeklyMileage weeks={data.weekly} />
      <CumulativeMileage weeks={data.weekly} />
      <PaceTrend trend={data.pace_trend} />

      {data.weekly.length > 0 && (
        <details className="data-table">
          <summary>Data table</summary>
          <table>
            <thead>
              <tr><th>Week of</th><th>Miles</th><th>Cumulative</th></tr>
            </thead>
            <tbody>
              {data.weekly.map((w) => (
                <tr key={w.week_start}>
                  <td>{fmtDate(w.week_start)}</td>
                  <td>{w.miles.toFixed(1)}</td>
                  <td>{w.cumulative_mi.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.pace_trend.length > 0 && (
            <table>
              <thead>
                <tr><th>Date</th><th>Miles</th><th>Pace</th><th>5-run avg</th></tr>
              </thead>
              <tbody>
                {data.pace_trend.map((p) => (
                  <tr key={p.run_id}>
                    <td>{fmtDate(p.local_date)}</td>
                    <td>{p.distance_mi.toFixed(1)}</td>
                    <td>{fmtPace(p.pace_s_per_mi)}</td>
                    <td>{fmtPace(p.rolling_pace_s_per_mi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      )}
    </div>
  );
}
