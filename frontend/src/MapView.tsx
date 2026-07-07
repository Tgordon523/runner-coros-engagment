import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import { bounds, buildLayers } from "./layers";
import type { Timeline } from "./timeline";
import type { GradientMetric, LayerMode, Track } from "./types";

const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface Props {
  tracks: Track[];
  mode: LayerMode;
  metric: GradientMetric;
  currentTime: number;
  timeline: Timeline;
}

export default function MapView({ tracks, mode, metric, currentTime, timeline }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const fittedRef = useRef<string>("");

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [-98.5, 39.8],
      zoom: 3,
      // recorder reads pixels off this canvas
      preserveDrawingBuffer: true,
    });
    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);
    mapRef.current = map;
    overlayRef.current = overlay;
    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    overlayRef.current?.setProps({
      layers: buildLayers(tracks, mode, metric, currentTime, timeline),
    });
  }, [tracks, mode, metric, currentTime, timeline]);

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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
