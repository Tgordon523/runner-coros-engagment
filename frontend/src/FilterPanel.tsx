import type { Meta } from "./types";
import type { Filters } from "./useFilters";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EFFORTS = ["easy", "moderate", "hard", "max"];
const TIMES = ["morning", "lunch", "evening", "night"];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  meta: Meta | null;
}

export default function FilterPanel({ filters, onChange, meta }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const years: string[] = [];
  if (meta?.first_date && meta.last_date) {
    const first = Number(meta.first_date.slice(0, 4));
    const last = Number(meta.last_date.slice(0, 4));
    for (let y = last; y >= first; y--) years.push(String(y));
  }

  return (
    <div className="panel">
      <label className="field">
        <span>Period</span>
        <select
          value={filters.period}
          onChange={(e) => set({ period: e.target.value })}
        >
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="ytd">Year to date</option>
          {years.map((y) => (
            <option key={y} value={`year-${y}`}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <span>Day</span>
        <div className="chips">
          {DAYS.map((d, i) => (
            <button
              key={d}
              className={filters.days.includes(i) ? "chip on" : "chip"}
              onClick={() => set({ days: toggle(filters.days, i) })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Effort</span>
        <div className="chips">
          {EFFORTS.map((e) => (
            <button
              key={e}
              className={filters.efforts.includes(e) ? "chip on" : "chip"}
              onClick={() => set({ efforts: toggle(filters.efforts, e) })}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Time of day</span>
        <div className="chips">
          {TIMES.map((t) => (
            <button
              key={t}
              className={filters.times.includes(t) ? "chip on" : "chip"}
              onClick={() => set({ times: toggle(filters.times, t) })}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Distance (mi)</span>
        <div className="range">
          <input
            type="number"
            min="0"
            placeholder="min"
            value={filters.minMi}
            onChange={(e) => set({ minMi: e.target.value })}
          />
          <span>–</span>
          <input
            type="number"
            min="0"
            placeholder="max"
            value={filters.maxMi}
            onChange={(e) => set({ maxMi: e.target.value })}
          />
        </div>
      </div>

      {meta && meta.sports.length > 1 && (
        <div className="field">
          <span>Sport</span>
          <div className="chips">
            {meta.sports.map((s) => (
              <button
                key={s}
                className={filters.sports.includes(s) ? "chip on" : "chip"}
                onClick={() => set({ sports: toggle(filters.sports, s) })}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
