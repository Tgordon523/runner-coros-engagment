import { describe, expect, it } from "vitest";
import {
  WIRE_COLUMNS,
  assertWireColumns,
  hr,
  lat,
  lon,
  paceSPerMi,
  tOffsetS,
  type TrackPoint,
} from "./trackpoint";

describe("Track Point wire contract — mirrors backend/app/trackpoint.py", () => {
  it("accessors follow WIRE_COLUMNS order", () => {
    const sample: TrackPoint = [1, 2, 3, 4, 5]; // distinct value per slot
    const byName: Record<string, (p: TrackPoint) => number | null> = {
      lon,
      lat,
      t_offset_s: tOffsetS,
      hr,
      pace_s_per_mi: paceSPerMi,
    };
    expect(WIRE_COLUMNS.map((c) => byName[c](sample))).toEqual([1, 2, 3, 4, 5]);
  });

  it("assertWireColumns fails loud on drift", () => {
    expect(() => assertWireColumns([...WIRE_COLUMNS])).not.toThrow();
    expect(() =>
      assertWireColumns(["lat", "lon", "t_offset_s", "hr", "pace_s_per_mi"])
    ).toThrow(/wire mismatch/);
  });
});
