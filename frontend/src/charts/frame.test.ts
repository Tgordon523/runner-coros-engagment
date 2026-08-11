import { describe, expect, it } from "vitest";
import { H, PAD, W } from "./common";
import { hoverIndex, linePath, makeScales, milesDomain } from "./frame";

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

describe("makeScales — y", () => {
  it("maps domain[0] to the bottom edge and domain[1] to the top", () => {
    const { y } = makeScales(10, [0, 100], "band");
    expect(y(0)).toBe(PAD.top + PLOT_H);
    expect(y(100)).toBe(PAD.top);
    expect(y(50)).toBe(PAD.top + PLOT_H / 2);
  });

  it("a reversed domain inverts the axis (pace: faster sits higher)", () => {
    const { y } = makeScales(10, [630, 510], "point");
    expect(y(630)).toBe(PAD.top + PLOT_H); // slow at the bottom
    expect(y(510)).toBe(PAD.top); // fast at the top
  });

  it("is monotonic over the domain", () => {
    const { y } = makeScales(5, [0, 40], "band");
    for (let v = 0; v < 40; v += 5) expect(y(v)).toBeGreaterThan(y(v + 5));
  });
});

describe("makeScales — x", () => {
  it("band mode centers each index in its slot", () => {
    const { x, slot } = makeScales(4, [0, 1], "band");
    expect(slot).toBe(PLOT_W / 4);
    expect(x(0)).toBe(PAD.left + slot / 2);
    expect(x(3)).toBe(PAD.left + 3 * slot + slot / 2);
  });

  it("point mode puts endpoints at the plot edges", () => {
    const { x } = makeScales(5, [0, 1], "point");
    expect(x(0)).toBe(PAD.left);
    expect(x(4)).toBe(PAD.left + PLOT_W);
  });

  it("a single point sits at the plot center", () => {
    const { x } = makeScales(1, [0, 1], "point");
    expect(x(0)).toBe(PAD.left + PLOT_W / 2);
  });
});

describe("milesDomain", () => {
  it("domain top is the last tick, so no mark overflows the grid", () => {
    const { ticks, domain } = milesDomain(23);
    expect(domain).toEqual([0, ticks[ticks.length - 1]]);
    expect(domain[1]).toBeGreaterThanOrEqual(23);
  });
});

describe("linePath", () => {
  it("moves to the first point then lines through the rest", () => {
    expect(linePath(3, (i) => [i * 10, i * 5])).toBe("M0.0,0.0L10.0,5.0L20.0,10.0");
    expect(linePath(0, () => [0, 0])).toBe("");
  });
});

describe("hoverIndex", () => {
  it("band mode: each slot maps to its own index", () => {
    const slot = PLOT_W / 4;
    expect(hoverIndex(PAD.left + slot * 0.5, 4, "band")).toBe(0);
    expect(hoverIndex(PAD.left + slot * 3.9, 4, "band")).toBe(3);
  });

  it("point mode: rounds to the nearest index", () => {
    expect(hoverIndex(PAD.left, 5, "point")).toBe(0);
    expect(hoverIndex(PAD.left + PLOT_W, 5, "point")).toBe(4);
    expect(hoverIndex(PAD.left + PLOT_W * 0.26, 5, "point")).toBe(1);
  });

  it("outside the data range is null", () => {
    expect(hoverIndex(PAD.left - 5, 4, "band")).toBeNull();
    expect(hoverIndex(W, 4, "band")).toBeNull();
    expect(hoverIndex(PAD.left + 10, 0, "band")).toBeNull();
  });
});
