/** The one place filter state becomes query strings — mirrors backend RunFilter. */

import { useEffect, useState } from "react";
import { apiGet } from "./api";
import type { Dashboard, Meta, Track } from "./types";

export interface Filters {
  period: string; // all | 7d | 30d | 90d | ytd | year-YYYY
  days: number[]; // 0=Monday
  efforts: string[];
  times: string[];
  sports: string[];
  minMi: string;
  maxMi: string;
}

export const defaultFilters: Filters = {
  period: "all",
  days: [],
  efforts: [],
  times: [],
  sports: [],
  minMi: "",
  maxMi: "",
};

export function toQuery(f: Filters): string {
  const q = new URLSearchParams();
  if (f.period !== "all") q.set("period", f.period);
  if (f.days.length) q.set("day", f.days.join(","));
  if (f.efforts.length) q.set("effort", f.efforts.join(","));
  if (f.times.length) q.set("time_of_day", f.times.join(","));
  if (f.sports.length) q.set("sport", f.sports.join(","));
  if (f.minMi !== "") q.set("min_mi", f.minMi);
  if (f.maxMi !== "") q.set("max_mi", f.maxMi);
  return q.toString();
}

/** One fetch per filter change; every map layer consumes the same result. */
export function useTracks(filters: Filters): {
  tracks: Track[];
  loading: boolean;
  error: string | null;
} {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = toQuery(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet<Track[]>(`/api/tracks${query ? `?${query}` : ""}`)
      .then((t) => {
        if (!cancelled) {
          setTracks(t);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query]);

  return { tracks, loading, error };
}

/** One dashboard fetch per filter change; every chart consumes the same
 * payload (weekly + pace respect filters, goal never does — see CONTEXT.md). */
export function useDashboard(filters: Filters, refreshKey = 0): Dashboard | null {
  const [data, setData] = useState<Dashboard | null>(null);
  const query = toQuery(filters);
  useEffect(() => {
    let cancelled = false;
    apiGet<Dashboard>(`/api/dashboard${query ? `?${query}` : ""}`)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, [query, refreshKey]);
  return data;
}

export function useMeta(refreshKey = 0): Meta | null {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    apiGet<Meta>("/api/meta").then(setMeta).catch(() => setMeta(null));
  }, [refreshKey]);
  return meta;
}
