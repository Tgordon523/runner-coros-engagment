import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { ZONE_COLORS, bounds, buildLayers } from "./layers";
import type { CaptureSurface } from "./recording";
import type { Timeline } from "./timeline";
import type { GradientMetric, LayerMode, Track } from "./types";
import { zoneRanges, type ZoneConfig } from "./zones";

const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const ZONE_LABELS = ["Easy", "Moderate", "Hard", "Max"]; // mirrors effort.NAMES

function ZoneLegend({ metric, zones }: { metric: GradientMetric; zones: ZoneConfig }) {
  const ranges = zoneRanges(metric, zones);
  return (
    <div className="map-legend">
      <span className="legend-title">
        {metric === "hr" ? "Effort (bpm)" : "Pace (min/mi)"}
      </span>
      {ranges ? (
        ZONE_LABELS.map((label, i) => (
          <span key={label} className="legend-row">
            <i style={{ background: `rgb(${ZONE_COLORS[i].join(",")})` }} />
            {label} · {ranges[i]}
          </span>
        ))
      ) : (
        <span className="legend-row">Set pace zones in Settings</span>
      )}
    </div>
  );
}

interface Props {
  tracks: Track[];
  mode: LayerMode;
  metric: GradientMetric;
  currentTime: number;
  timeline: Timeline;
  zones: ZoneConfig;
  /** Hands the recorder this map's pixels; called with null on unmount. */
  onCaptureSurface?: (s: CaptureSurface | null) => void;
}

export default function MapView({
  tracks,
  mode,
  metric,
  currentTime,
  timeline,
  zones,
  onCaptureSurface,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const fittedRef = useRef<string>("");
  const onSurfaceRef = useRef(onCaptureSurface);
  onSurfaceRef.current = onCaptureSurface;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const map = new maplibregl.Map({
      container,
      style: DARK_STYLE,
      center: [-98.5, 39.8],
      zoom: 3,
      // the capture surface reads pixels off this canvas
      preserveDrawingBuffer: true,
    });
    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);
    mapRef.current = map;
    overlayRef.current = overlay;
    // basemap + deck both render into canvases under this container; that
    // knowledge stays here, behind CaptureSurface
    onSurfaceRef.current?.({
      canvases: () => Array.from(container.querySelectorAll("canvas")),
    });
    return () => {
      onSurfaceRef.current?.(null);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    overlayRef.current?.setProps({
      layers: buildLayers(tracks, mode, metric, currentTime, timeline, zones),
    });
  }, [tracks, mode, metric, currentTime, timeline, zones]);

  // fit once per distinct set of runs, not on every filter tick
  useEffect(() => {
    const key = tracks.map((t) => t.run_id).join(",");
    if (!tracks.length || key === fittedRef.current || !mapRef.current) return;
    const b = bounds(tracks);
    if (b) {
      mapRef.current.fitBounds(b, { padding: 60, duration: 800 });
      fittedRef.current = key;
    }
  }, [tracks]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {mode === "gradient" && <ZoneLegend metric={metric} zones={zones} />}
    </div>
  );
}
