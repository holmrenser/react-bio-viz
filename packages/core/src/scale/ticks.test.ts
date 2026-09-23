import { describe, expect, it } from "vitest";

import { computeAxisTicks, computeColumnTicks, pickNiceLength, pickTickStep } from "./ticks";

describe("pickNiceLength", () => {
  it("returns 0 for non-positive input", () => {
    expect(pickNiceLength(0)).toBe(0);
    expect(pickNiceLength(-5)).toBe(0);
  });

  it("rounds to the nearest 1/2/5x10^n value", () => {
    expect(pickNiceLength(0.9)).toBe(1);
    expect(pickNiceLength(4)).toBe(5);
    expect(pickNiceLength(35)).toBe(20); // equidistant from 20 and 50; ties favor the smaller candidate
    expect(pickNiceLength(120)).toBe(100);
  });

  it("works across decades", () => {
    expect(pickNiceLength(0.0009)).toBe(0.001);
    expect(pickNiceLength(3400)).toBe(2000); // 2000 is 1400 away, 5000 is 1600 away
    expect(pickNiceLength(4000)).toBe(5000);
  });
});

describe("pickTickStep", () => {
  it("picks step 1 when a single unit is already wide enough", () => {
    expect(pickTickStep(64)).toBe(1);
  });

  it("picks a larger step as units get narrower", () => {
    expect(pickTickStep(32)).toBe(2);
    expect(pickTickStep(1)).toBe(100);
  });

  it("keeps labelled ticks at least minSpacing apart", () => {
    for (const pixelsPerUnit of [0.01, 0.3, 1, 7, 40, 200]) {
      expect(pickTickStep(pixelsPerUnit) * pixelsPerUnit).toBeGreaterThanOrEqual(64);
    }
  });

  it("scales past the top of the ladder instead of clamping", () => {
    // 25000 (ladder top) * 0.0001 = 2.5px — far below the 64px minimum, so it must keep going.
    expect(pickTickStep(0.0001) * 0.0001).toBeGreaterThanOrEqual(64);
  });

  it("honours a custom minSpacing", () => {
    expect(pickTickStep(10, 20)).toBe(2);
    expect(pickTickStep(10, 200)).toBe(25);
  });

  it("does not loop forever on a zero or negative scale", () => {
    expect(Number.isFinite(pickTickStep(0))).toBe(true);
    expect(Number.isFinite(pickTickStep(-5))).toBe(true);
  });
});

describe("computeColumnTicks", () => {
  const base = { columnCount: 1000, width: 800, offsetX: 0, pixelsPerColumn: 16 };

  it("returns nothing for a degenerate viewport", () => {
    expect(computeColumnTicks({ ...base, columnCount: 0 })).toEqual([]);
    expect(computeColumnTicks({ ...base, width: 0 })).toEqual([]);
    expect(computeColumnTicks({ ...base, pixelsPerColumn: 0 })).toEqual([]);
  });

  it("labels 1-based positions on 0-based column indices", () => {
    const major = computeColumnTicks(base).filter((t) => t.label !== null);
    expect(major.length).toBeGreaterThan(0);
    for (const tick of major) {
      expect(tick.label).toBe(tick.value + 1);
    }
  });

  it("emits minor ticks between the labelled ones", () => {
    const ticks = computeColumnTicks(base);
    expect(ticks.some((t) => t.label === null)).toBe(true);
  });

  it("keeps ticks within the visible column range", () => {
    const ticks = computeColumnTicks({ ...base, columnCount: 40 });
    for (const tick of ticks) {
      expect(tick.value).toBeGreaterThanOrEqual(0);
      expect(tick.value).toBeLessThan(40);
    }
  });

  it("shifts tick pixel positions by offsetX when panned", () => {
    const atRest = computeColumnTicks(base);
    const panned = computeColumnTicks({ ...base, offsetX: -160 });
    const shared = panned.find((p) => atRest.some((a) => a.value === p.value));
    expect(shared).toBeDefined();
    const original = atRest.find((a) => a.value === shared!.value)!;
    expect(shared!.x).toBeCloseTo(original.x - 160);
  });

  it("centres each tick within its column", () => {
    const [first] = computeColumnTicks({ ...base, pixelsPerColumn: 64 });
    expect(first.x).toBeCloseTo(first.value * 64 + 32);
  });
});

describe("computeAxisTicks", () => {
  it("returns nothing for a degenerate domain or range", () => {
    expect(computeAxisTicks({ domain: [5, 5], range: [0, 100] })).toEqual([]);
    expect(computeAxisTicks({ domain: [0, 10], range: [0, 0] })).toEqual([]);
  });

  it("labels round numbers rather than an even division of the span", () => {
    const labels = computeAxisTicks({ domain: [1017, 8933], range: [0, 800] })
      .filter((t) => t.label !== null)
      .map((t) => t.label!);
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label % 1000).toBe(0);
    }
  });

  it("keeps every tick inside the domain", () => {
    for (const tick of computeAxisTicks({ domain: [1017, 8933], range: [0, 800] })) {
      expect(tick.value).toBeGreaterThanOrEqual(1017);
      expect(tick.value).toBeLessThanOrEqual(8933);
    }
  });

  it("maps values onto the pixel range linearly", () => {
    const ticks = computeAxisTicks({ domain: [0, 1000], range: [0, 500] });
    for (const tick of ticks) {
      expect(tick.x).toBeCloseTo((tick.value / 1000) * 500);
    }
  });

  it("emits only labelled ticks when includeMinor is false", () => {
    const ticks = computeAxisTicks({ domain: [0, 10000], range: [0, 800], includeMinor: false });
    expect(ticks.every((t) => t.label !== null)).toBe(true);
  });

  it("handles a genome-scale domain without hanging", () => {
    const ticks = computeAxisTicks({ domain: [35_039_693, 35_045_433], range: [0, 1200] });
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.length).toBeLessThan(200);
  });
});
