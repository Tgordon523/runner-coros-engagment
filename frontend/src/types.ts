import type { TrackPoint } from "./trackpoint";

export type { TrackPoint };

export interface Track {
  run_id: number;
  started_at: string;
  distance_mi: number;
  effort: string | null;
  points: TrackPoint[];
}

export interface Meta {
  sports: string[];
  efforts: string[];
  times_of_day: string[];
  days: string[];
  periods: { value: string; label: string }[];
  track_point_columns: string[];
  first_date: string | null;
  last_date: string | null;
  run_count: number;
  max_hr: number;
  effort_bounds_pct: number[];
  pace_zone_s_per_mi: number[];
}

export interface SyncStatus {
  /** "ok" | "partial" | "error" | "running" | "already-running" | "never-run" */
  status: string;
  finished_at?: string | null;
  new_runs?: number;
  error?: string | null;
  /** When a sync last actually reached COROS, i.e. how stale the runs are. */
  last_ok_at?: string | null;
}

export type LayerMode = "heatmap" | "gradient" | "timelapse";
export type GradientMetric = "hr" | "pace";

export interface WeekBucket {
  week_start: string;
  miles: number;
  cumulative_mi: number;
}

export interface DayBucket {
  date: string;
  miles: number;
  cumulative_mi: number;
}

export interface PacePoint {
  run_id: number;
  local_date: string;
  distance_mi: number;
  pace_s_per_mi: number;
  rolling_pace_s_per_mi: number;
}

export interface GoalStatus {
  target_mi: number;
  ytd_mi: number;
  elapsed_fraction: number;
  required_to_date_mi: number | null;
  projected_mi: number | null;
  required_per_week_mi: number | null;
  on_track: boolean | null;
}

export interface Dashboard {
  weekly: WeekBucket[];
  daily: DayBucket[];
  pace_trend: PacePoint[];
  goal: GoalStatus;
}

export interface PrivacyZone {
  lat: number;
  lon: number;
  radius_m: number;
}

export interface Settings {
  annual_goal_mi: number;
  max_hr: number;
  privacy_zones: PrivacyZone[];
  start_zone_enabled: boolean;
  pace_zone_s_per_mi: number[];
}
