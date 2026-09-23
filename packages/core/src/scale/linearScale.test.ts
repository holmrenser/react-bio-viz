import { describe, expect, it } from "vitest";

import { createLinearScale } from "./linearScale";

describe("createLinearScale", () => {
  it("maps domain values to the range", () => {
    const scale = createLinearScale([0, 100], [0, 500]);
    expect(scale(0)).toBe(0);
    expect(scale(50)).toBe(250);
    expect(scale(100)).toBe(500);
  });

  it("extrapolates outside the domain", () => {
    const scale = createLinearScale([0, 100], [0, 500]);
    expect(scale(150)).toBe(750);
    expect(scale(-10)).toBe(-50);
  });

  it("supports an inverted range", () => {
    const scale = createLinearScale([0, 10], [100, 0]);
    expect(scale(0)).toBe(100);
    expect(scale(10)).toBe(0);
    expect(scale(5)).toBe(50);
  });

  it("inverts range values back to domain values", () => {
    const scale = createLinearScale([0, 100], [0, 500]);
    expect(scale.invert(250)).toBe(50);
    expect(scale.invert(0)).toBe(0);
    expect(scale.invert(500)).toBe(100);
  });

  it("exposes domain() and range()", () => {
    const scale = createLinearScale([2, 20], [3, 30]);
    expect(scale.domain()).toEqual([2, 20]);
    expect(scale.range()).toEqual([3, 30]);
  });

  it("does not divide by zero when the domain collapses", () => {
    const scale = createLinearScale([5, 5], [0, 100]);
    expect(scale(5)).toBe(0);
    expect(scale(999)).toBe(0);
  });
});
