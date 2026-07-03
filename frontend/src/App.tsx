import { useEffect, useRef, useState } from "react";
import DashboardView from "./DashboardView";
import FilterPanel from "./FilterPanel";
import MapView from "./MapView";
import SyncPanel from "./SyncPanel";
import { maxDuration } from "./layers";
import type { GradientMetric, LayerMode } from "./types";
import {
  defaultFilters,
  useDashboard,
  useMeta,
  useTracks,
  type Filters,
} from "./useFilters";
import { usePlayback } from "./usePlayback";
import { useRecorder } from "./useRecorder";

const MODES: { id: LayerMode; label: string }[] = [
  { id: "heatmap", label: "Heatmap" },
  { id: "gradient", label: "Trails" },
  { id: "timelapse", label: "Timelapse" },
];

export default function App() {
  const [view, setView] = useState<"map" | "dashboard">("map");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [privacyOn, setPrivacyOn] = useState(false);
  const meta = useMeta(refreshKey);
  const { tracks, loading, error } = useTracks(filters, privacyOn);
  const dashboard = useDashboard(filters, refreshKey);

  const [mode, setMode] = useState<LayerMode>("heatmap");
  const [metric, setMetric] = useState<GradientMetric>("hr");
  const mapRef = useRef<HTMLElement>(null);

  const duration = maxDuration(tracks);
  const playback = usePlayback(duration, mode === "timelapse" && view === "map");
  const recorder = useRecorder();

  useEffect(() => {
    if (mode === "timelapse") playback.reset();
    else playback.setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tracks]);

  // one full loop per recording: stop when the clock reaches the end
  useEffect(() => {
    if (recorder.state === "recording" && duration > 0 && playback.time >= duration) {
      recorder.stop();
      playback.setPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.time, recorder.state, duration]);

  const record = () => {
    if (!mapRef.current) return;
    playback.seek(0);
    playback.setPlaying(true);
    recorder.start(mapRef.current);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Run Tracker</h1>
        <div className="modes">
          <button
            className={view === "map" ? "mode on" : "mode"}
            onClick={() => setView("map")}
          >
            Map
          </button>
          <button
            className={view === "dashboard" ? "mode on" : "mode"}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
        </div>

        <SyncPanel onSynced={() => setRefreshKey((k) => k + 1)} />

        {view === "map" && (
          <>
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
                  Playback · {fmt(playback.time)} / {fmt(duration)}
                </span>
                <div className="playback">
                  <button onClick={() => playback.setPlaying((p) => !p)}>
                    {playback.playing ? "Pause" : "Play"}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={1}
                    value={Math.min(playback.time, duration)}
                    onChange={(e) => playback.seek(Number(e.target.value))}
                  />
                </div>
                <div className="playback">
                  <span className="dim">speed</span>
                  <input
                    type="range"
                    min={10}
                    max={600}
                    step={10}
                    value={playback.speed}
                    onChange={(e) => playback.setSpeed(Number(e.target.value))}
                  />
                  <span className="dim">{playback.speed}×</span>
                </div>

                <span>Export</span>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={privacyOn}
                    onChange={(e) => setPrivacyOn(e.target.checked)}
                  />
                  Apply privacy zones
                </label>
                <div className="playback">
                  <button
                    onClick={recorder.state === "recording" ? recorder.stop : record}
                    disabled={recorder.state === "converting" || !tracks.length}
                  >
                    {recorder.state === "idle" && "⏺ Record MP4"}
                    {recorder.state === "recording" && "⏹ Stop"}
                    {recorder.state === "converting" && "Converting…"}
                  </button>
                  {recorder.state === "recording" && duration > 0 && (
                    <span className="dim">
                      {Math.min(100, Math.round((playback.time / duration) * 100))}%
                    </span>
                  )}
                </div>
                <p className="dim">
                  Records one full playback at the chosen speed — video length ≈{" "}
                  {duration ? Math.ceil(duration / playback.speed) : 0}s.
                </p>
              </div>
            )}
          </>
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
      <main className="map" ref={mapRef}>
        {view === "map" ? (
          <MapView
            tracks={tracks}
            mode={mode}
            metric={metric}
            currentTime={playback.time}
          />
        ) : (
          <DashboardView
            data={dashboard}
            onSettingsSaved={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </main>
    </div>
  );
}
