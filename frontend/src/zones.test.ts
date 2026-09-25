import { describe, expect, it } from "vitest";
import { parsePaceThresholds } from "./SettingsPanel";
import type { Meta } from "./types";
import {
  fmtPace,
  hrZone,
  paceZone,
  zoneConfig,
  zoneLabels,
  zoneRanges,
  type ZoneConfig,
} from "./zones";

const CFG: ZoneConfig = {
  maxHr: 190,
  effortBoundsPct: [0.7, 0.8, 0.9],
  effortNames: ["easy", "moderate", "hard", "max"],
  paceBoundsSPerMi: [510, 570, 630],
};

describe("zoneConfig — the bucketing comes from meta, never from here", () => {
  it("is null until meta lands, with no local defaults to fall back on", () => {
    expect(zoneConfig(null)).toBeNull();
  });

  it("takes every bound from what the backend served", () => {
    const meta = {
      max_hr: 180,
      effort_bounds_pct: [0.6, 0.75, 0.85],
      efforts: ["easy", "moderate", "hard", "max"],
      pace_zone_s_per_mi: [510, 570, 630],
    } as Meta;
    expect(zoneConfig(meta)).toEqual({
      maxHr: 180,
      effortBoundsPct: [0.6, 0.75, 0.85],
      effortNames: ["easy", "moderate", "hard", "max"],
      paceBoundsSPerMi: [510, 570, 630],
    });
  });
});

describe("hrZone — mirrors backend Effort boundaries at max HR 190", () => {
  it("buckets with inclusive lower bounds (133/152/171)", () => {
    expect(hrZone(132, CFG)).toBe(0);
    expect(hrZone(133, CFG)).toBe(1);
    expect(hrZone(151, CFG)).toBe(1);
    expect(hrZone(152, CFG)).toBe(2);
    expect(hrZone(170, CFG)).toBe(2);
    expect(hrZone(171, CFG)).toBe(3);
    expect(hrZone(190, CFG)).toBe(3);
  });
});

describe("paceZone — faster pace is a higher zone", () => {
  it("buckets against ascending thresholds", () => {
    expect(paceZone(480, CFG)).toBe(3); // faster than 8:30
    expect(paceZone(510, CFG)).toBe(2);
    expect(paceZone(569, CFG)).toBe(2);
    expect(paceZone(570, CFG)).toBe(1);
    expect(paceZone(630, CFG)).toBe(0); // slower than 10:30
    expect(paceZone(900, CFG)).toBe(0);
  });

  it("null until thresholds are configured", () => {
    expect(paceZone(480, { ...CFG, paceBoundsSPerMi: [] })).toBeNull();
  });
});

describe("zoneRanges — legend text", () => {
  it("hr ranges come from max HR", () => {
    expect(zoneRanges("hr", CFG)).toEqual(["< 133", "133–151", "152–170", "≥ 171"]);
  });

  it("pace ranges easy→max in mm:ss; null when unconfigured", () => {
    expect(zoneRanges("pace", CFG)).toEqual([
      "≥ 10:30", "9:30–10:30", "8:30–9:30", "< 8:30",
    ]);
    expect(zoneRanges("pace", { ...CFG, paceBoundsSPerMi: [] })).toBeNull();
  });
});

describe("parsePaceThresholds — parsing only; the backend validates", () => {
  it("parses mm:ss and plain seconds, sorts ascending", () => {
    expect(parsePaceThresholds("8:30, 9:30, 10:30")).toEqual([510, 570, 630]);
    expect(parsePaceThresholds("630, 8:30, 570")).toEqual([510, 570, 630]);
    expect(parsePaceThresholds("")).toEqual([]);
  });

  it("passes bad sets through for the backend 422 to reject", () => {
    // wrong count, duplicates, non-positive: settings.py owns the invariant
    expect(parsePaceThresholds("8:30, 9:30")).toEqual([510, 570]);
    expect(parsePaceThresholds("8:30, 8:30, 10:30")).toEqual([510, 510, 630]);
    expect(parsePaceThresholds("0, 570, 630")).toEqual([0, 570, 630]);
  });
});

describe("zoneLabels — legend labels from meta's Effort names", () => {
  it("capitalizes the served names", () => {
    expect(zoneLabels(CFG)).toEqual(["Easy", "Moderate", "Hard", "Max"]);
  });
});

describe("fmtPace", () => {
  it("renders s/mi as m:ss", () => {
    expect(fmtPace(510)).toBe("8:30");
    expect(fmtPace(600)).toBe("10:00");
    expect(fmtPace(65)).toBe("1:05");
  });
});
