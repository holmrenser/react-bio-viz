import { describe, expect, it } from "vitest";

import { clampToExtent, fitToExtent, panBy, zoomAt, zoomBy, type Viewport } from "./Viewport";

const extent = { xMin: 0, xMax: 100, yMin: 0, yMax: 50 };

function makeViewport(overrides: Partial<Viewport> = {}): Viewport {
  return { ...fitToExtent(extent), ...overrides };
}

describe("fitToExtent", () => {
  it("returns a viewport spanning the full extent", () => {
    expect(fitToExtent(extent)).toEqual({ x0: 0, x1: 100, y0: 0, y1: 50, ...extent });
  });
});

describe("clampToExtent", () => {
  it("leaves a viewport already within bounds unchanged", () => {
    const v = makeViewport({ x0: 10, x1: 20, y0: 5, y1: 15 });
    expect(clampToExtent(v)).toEqual(v);
  });

  it("pulls a window back inside bounds when it overshoots the low end", () => {
    const v = makeViewport({ x0: -10, x1: 10 });
    const clamped = clampToExtent(v);
    expect(clamped.x0).toBe(0);
    expect(clamped.x1).toBe(20);
  });

  it("pulls a window back inside bounds when it overshoots the high end", () => {
    const v = makeViewport({ x0: 90, x1: 120 });
    const clamped = clampToExtent(v);
    expect(clamped.x1).toBe(100);
    expect(clamped.x0).toBe(70);
  });

  it("never produces a span wider than the extent", () => {
    const v = makeViewport({ x0: -50, x1: 200 });
    const clamped = clampToExtent(v);
    expect(clamped.x1 - clamped.x0).toBe(100);
  });

  it("never collapses a span to zero or negative width", () => {
    const v = makeViewport({ x0: 50, x1: 50 });
    const clamped = clampToExtent(v);
    expect(clamped.x1).toBeGreaterThan(clamped.x0);
  });
});

describe("panBy", () => {
  it("shifts the window by the given delta", () => {
    const v = makeViewport({ x0: 10, x1: 30, y0: 5, y1: 15 });
    const panned = panBy(v, 5, -2);
    expect(panned.x0).toBe(15);
    expect(panned.x1).toBe(35);
    expect(panned.y0).toBe(3);
    expect(panned.y1).toBe(13);
  });

  it("clamps so panning past the extent stops at the boundary", () => {
    const v = makeViewport({ x0: 0, x1: 20 });
    const panned = panBy(v, -100, 0);
    expect(panned.x0).toBe(0);
    expect(panned.x1).toBe(20);
  });

  it("preserves the span while clamped", () => {
    const v = makeViewport({ x0: 80, x1: 100 });
    const panned = panBy(v, 50, 0);
    expect(panned.x1 - panned.x0).toBe(20);
    expect(panned.x1).toBe(100);
  });
});

describe("zoomBy", () => {
  it("shrinks the window around its own center when factor < 1", () => {
    const v = makeViewport({ x0: 0, x1: 100, y0: 0, y1: 50 });
    const zoomed = zoomBy(v, 0.5);
    expect(zoomed.x0).toBeCloseTo(25);
    expect(zoomed.x1).toBeCloseTo(75);
    expect(zoomed.y0).toBeCloseTo(12.5);
    expect(zoomed.y1).toBeCloseTo(37.5);
  });

  it("grows the window around its own center when factor > 1, clamped to extent", () => {
    const v = makeViewport({ x0: 40, x1: 60, y0: 20, y1: 30 });
    const zoomed = zoomBy(v, 10);
    expect(zoomed.x0).toBe(0);
    expect(zoomed.x1).toBe(100);
  });
});

describe("zoomAt", () => {
  it("keeps the anchor point fixed while zooming in", () => {
    const v = makeViewport({ x0: 0, x1: 100, y0: 0, y1: 50 });
    const point = { x: 20, y: 10 };
    const zoomed = zoomAt(v, point, 0.5);
    // the anchor point should sit at the same relative position (20%) in the new window
    const newRatio = (point.x - zoomed.x0) / (zoomed.x1 - zoomed.x0);
    expect(newRatio).toBeCloseTo(0.2, 5);
  });

  it("is equivalent to zoomBy when the anchor is the viewport center", () => {
    const v = makeViewport({ x0: 0, x1: 100, y0: 0, y1: 50 });
    const center = { x: 50, y: 25 };
    expect(zoomAt(v, center, 0.5)).toEqual(zoomBy(v, 0.5));
  });
});
