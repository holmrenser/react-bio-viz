import { describe, expect, it } from "vitest";

import { DIVIDER_SIZE, HEADER_HEIGHT, MAX_CELL_SIZE } from "../constants";
import { computeGridLayout, defaultGridViewport, gridExtent, limitGridZoom } from "./layout";

const base = { width: 650, height: 500, cellWidth: 44, cellHeight: 22, labelWidth: 160 };

describe("computeGridLayout", () => {
  it("gives the grid what the label column leaves", () => {
    const layout = computeGridLayout({ ...base, count: 100 });
    expect(layout.labelSpace).toBe(160 + DIVIDER_SIZE);
    expect(layout.gridWidth).toBe(650 - 160 - DIVIDER_SIZE);
    expect(layout.gridHeight).toBe(500 - HEADER_HEIGHT);
  });

  it("takes only the height a small matrix needs", () => {
    expect(computeGridLayout({ ...base, count: 3 }).gridHeight).toBe(3 * 22);
  });

  it("leaves no room for labels when they are hidden", () => {
    expect(computeGridLayout({ ...base, count: 3, labelWidth: null }).labelSpace).toBe(0);
  });
});

describe("defaultGridViewport", () => {
  it("shows the top-left corner at the default cell size", () => {
    const layout = computeGridLayout({ ...base, count: 100 });
    const viewport = defaultGridViewport(100, layout, 44, 22);
    expect([viewport.x0, viewport.y0]).toEqual([0, 0]);
    expect(viewport.x1).toBeCloseTo(layout.gridWidth / 44);
    expect(viewport.yMax).toBe(100);
  });

  it("extends a small matrix's extent to fill the grid", () => {
    const layout = computeGridLayout({ ...base, count: 3 });
    expect(gridExtent(3, layout, 44, 22).xMax).toBeCloseTo(layout.gridWidth / 44);
  });
});

describe("limitGridZoom", () => {
  it("stops zooming in once cells reach the maximum size", () => {
    const layout = computeGridLayout({ ...base, count: 100 });
    const viewport = defaultGridViewport(100, layout, 44, 22);
    const factor = limitGridZoom(0.01, viewport, layout);
    const cellWidth = layout.gridWidth / ((viewport.x1 - viewport.x0) * factor);
    expect(cellWidth).toBeLessThanOrEqual(MAX_CELL_SIZE + 1e-9);
  });
});
