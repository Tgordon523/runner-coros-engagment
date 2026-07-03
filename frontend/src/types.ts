/** [lon, lat, t_offset_s, hr, pace_s_per_mi] — matches /api/tracks points. */
export type TrackPoint = [number, number, number, number | null, number | null];

export interface Track {
  run_id: number;
  started_at: string;
  distance_mi: number;
  effort: string | null;
  points: TrackPoint[];
}

export interface Meta {
  sports: string[];
  first_date: string | null;
  last_date: string | null;
  run_count: number;
}

export interface SyncStatus {
  status: string;
  finished_at?: string | null;
  new_runs?: number;
  error?: string | null;
}

export type LayerMode = "heatmap" | "gradient" | "timelapse";
export type GradientMetric = "hr" | "pace";
