/** Wire layout of a Track Point from /api/tracks:
 * [lon, lat, t_offset_s, hr, pace_s_per_mi] — a compact positional tuple
 * (deck.gl-friendly). This module is the only place that order is known;
 * every consumer goes through these accessors, never by hand-index.
 * Backend mirror: backend/app/trackpoint.py — the two must change together.
 */

export type TrackPoint = [number, number, number, number | null, number | null];

export const lon = (p: TrackPoint): number => p[0];
export const lat = (p: TrackPoint): number => p[1];
export const tOffsetS = (p: TrackPoint): number => p[2];
export const hr = (p: TrackPoint): number | null => p[3];
export const paceSPerMi = (p: TrackPoint): number | null => p[4];

export const metricValue = (p: TrackPoint, metric: "hr" | "pace"): number | null =>
  metric === "hr" ? hr(p) : paceSPerMi(p);
