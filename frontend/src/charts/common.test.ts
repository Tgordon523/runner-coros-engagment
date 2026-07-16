import { describe, expect, it } from "vitest";
import { yTicks } from "./common";

describe("yTicks — top tick covers the data max so nothing clips", () => {
  it("last tick is >= max (charts use it as yMax)", () => {
    for (const max of [1, 3, 7, 42, 97, 100, 250, 999]) {
      const ticks = yTicks(max);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
    }
  });

  it("uses round steps and starts at zero", () => {
    expect(yTicks(97)).toEqual([0, 50, 100]);
    expect(yTicks(100)).toEqual([0, 50, 100]);
    expect(yTicks(4)).toEqual([0, 1, 2, 3, 4]);
  });

  it("handles non-positive max", () => {
    expect(yTicks(0)).toEqual([0]);
    expect(yTicks(-5)).toEqual([0]);
  });
});
