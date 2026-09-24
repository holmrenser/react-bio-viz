import { describe, expect, it } from "vitest";

import { contrastText, distanceColor, maxDistance } from "./colors";

describe("distance colours", () => {
  it("starts every scheme at white and deepens with distance", () => {
    for (const scheme of ["warm", "cool", "green", "grayscale"] as const) {
      expect(distanceColor(0, scheme)).toEqual([255, 255, 255]);
    }
    expect(distanceColor(1, "warm")).toEqual([102, 0, 0]);
    expect(distanceColor(1, "cool")).toEqual([0, 0, 102]);
    expect(distanceColor(1, "green")).toEqual([0, 102, 0]);
    expect(distanceColor(1, "grayscale")).toEqual([0, 0, 0]);
  });

  it("clamps out-of-range and non-finite intensities", () => {
    expect(distanceColor(2, "grayscale")).toEqual([0, 0, 0]);
    expect(distanceColor(Number.NaN, "grayscale")).toEqual([255, 255, 255]);
  });

  it("picks readable text", () => {
    expect(contrastText([255, 255, 255])).toBe("#000000");
    expect(contrastText([0, 0, 0])).toBe("#ffffff");
  });

  it("scales by the largest off-diagonal distance", () => {
    expect(maxDistance([[9, 0.2], [0.2, 9]])).toBe(0.2);
    expect(maxDistance([])).toBe(0);
  });
});
