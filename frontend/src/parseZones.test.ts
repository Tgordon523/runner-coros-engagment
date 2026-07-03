import { describe, expect, it } from "vitest";
import { parseZones } from "./SettingsPanel";

describe("parseZones — settings textarea -> PrivacyZone list", () => {
  it("parses one zone per line with loose whitespace", () => {
    expect(parseZones("41.88, -87.63, 200\n  41.9 ,-87.6,150  ")).toEqual([
      { lat: 41.88, lon: -87.63, radius_m: 200 },
      { lat: 41.9, lon: -87.6, radius_m: 150 },
    ]);
  });

  it("drops malformed and non-positive-radius lines", () => {
    expect(
      parseZones("garbage\n41.88, -87.63\n41.88, -87.63, 0\n41.88, -87.63, -5")
    ).toEqual([]);
  });

  it("empty text -> no zones", () => {
    expect(parseZones("")).toEqual([]);
    expect(parseZones("\n\n")).toEqual([]);
  });
});
