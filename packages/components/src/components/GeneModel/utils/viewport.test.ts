import { fitToExtent } from "@react-bio-viz/core";
import { describe, expect, it } from "vitest";

import { geneExtent, legacyPanViewport } from "./viewport";

describe("geneExtent", () => {
  it("pads the gene by 10% of its length on each side", () => {
    expect(geneExtent({ start: 1000, end: 2000 })).toEqual({ xMin: 900, xMax: 2100, yMin: 0, yMax: 1 });
  });

  it("never extends below position 0", () => {
    expect(geneExtent({ start: 50, end: 1050 }).xMin).toBe(0);
  });
});

describe("legacyPanViewport", () => {
  const extent = geneExtent({ start: 1000, end: 2000 });

  it("shows the whole extent for the defaults", () => {
    expect(legacyPanViewport(0, 100, extent, 1000)).toEqual(fitToExtent(extent));
  });

  it("trims percentages of the gene's length from either end", () => {
    const viewport = legacyPanViewport(25, 75, extent, 1000);
    expect([viewport.x0, viewport.x1]).toEqual([1150, 1850]);
  });
});
