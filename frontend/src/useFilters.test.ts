import { describe, expect, it } from "vitest";
import { defaultFilters, toQuery } from "./useFilters";

describe("toQuery — the query half of the RunFilter seam", () => {
  it("serializes nothing for default filters", () => {
    expect(toQuery(defaultFilters)).toBe("");
  });

  it("uses exactly the param names the backend's run_filter parses", () => {
    const q = new URLSearchParams(
      toQuery({
        period: "ytd",
        days: [5, 6],
        efforts: ["easy", "max"],
        times: ["morning"],
        sports: ["running"],
        minMi: "3",
        maxMi: "10",
      })
    );
    // contract pin: keep in sync with backend/app/filters.py run_filter()
    expect(Object.fromEntries(q)).toEqual({
      period: "ytd",
      day: "5,6",
      effort: "easy,max",
      time_of_day: "morning",
      sport: "running",
      min_mi: "3",
      max_mi: "10",
    });
  });

  it("omits period=all but keeps other presets", () => {
    expect(toQuery({ ...defaultFilters, period: "all" })).toBe("");
    expect(toQuery({ ...defaultFilters, period: "year-2025" })).toBe(
      "period=year-2025"
    );
  });

  it("omits empty distance strings", () => {
    expect(toQuery({ ...defaultFilters, minMi: "", maxMi: "" })).toBe("");
    expect(toQuery({ ...defaultFilters, minMi: "0" })).toBe("min_mi=0");
  });
});
