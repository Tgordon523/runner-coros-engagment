import { useEffect, useRef, useState } from "react";
import FilterPanel from "./FilterPanel";
import MapView from "./MapView";
import SyncPanel from "./SyncPanel";
import { maxDuration } from "./layers";
import type { GradientMetric, LayerMode } from "./types";
import { defaultFilters, useMeta, useTracks, type Filters } from "./useFilters";

const MODES: { id: LayerMode; label: string }[] = [
  { id: "heatmap", label: "Heatmap" },
  { id: "gradient", label: "Trails" },
  { id: "timelapse", label: "Timelapse" },
];

export default function App() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [metaKey, setMetaKey] = useState(0);
  const meta = useMeta(metaKey);
  const { tracks, loading, error } = useTracks(filters);

  const [mode, setMode] = useState<LayerMode>("heatmap");
  const [metric, setMetric] = useState<GradientMetric>("hr");

  // timelapse clock (seconds of run time)
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(60); // run-seconds per real second
  const rafRef = useRef<number>();
  const duration = maxDuration(tracks);

  useEffect(() => {
    if (!playing || mode !== "timelapse") return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => (duration ? (t + dt * speed) % (duration + 60) : 0));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [playing, mode, speed, duration]);

  useEffect(() => {
    if (mode === "timelapse") {
      setTime(0);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  }, [mode, tracks]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Run Tracker</h1>
        <SyncPanel onSynced={() => setMetaKey((k) => k + 1)} />

        <div className="modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={mode === m.id ? "mode on" : "mode"}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "gradient" && (
          <label className="field">
            <span>Color by</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as GradientMetric)}
            >
              <option value="hr">Heart rate</option>
              <option value="pace">Pace</option>
            </select>
          </label>
        )}

        {mode === "timelapse" && (
          <div className="field">
            <span>
              Playback · {fmt(time)} / {fmt(duration)}
            </span>
            <div className="playback">
              <button onClick={() => setPlaying((p) => !p)}>
                {playing ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={1}
                value={Math.min(time, duration)}
                onChange={(e) => setTime(Number(e.target.value))}
              />
            </div>
            <div className="playback">
              <span className="dim">speed</span>
              <input
                type="range"
                min={10}
                max={600}
                step={10}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
              <span className="dim">{speed}×</span>
            </div>
          </div>
        )}

        <FilterPanel filters={filters} onChange={setFilters} meta={meta} />

        <p className="status">
          {error
            ? error
            : loading
            ? "Loading…"
            : `${tracks.length} runs on map${
                meta ? ` · ${meta.run_count} total` : ""
              }`}
        </p>
      </aside>
      <main className="map">
        <MapView
          tracks={tracks}
          mode={mode}
          metric={metric}
          currentTime={time}
        />
      </main>
    </div>
  );
}
