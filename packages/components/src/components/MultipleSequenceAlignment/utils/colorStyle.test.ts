import { GAP_COLOR, qualityGradient } from "@react-bio-viz/core";
import { describe, expect, it } from "vitest";

import { cellColor, COLOR_STYLES, type ColumnColorContext } from "./colorStyle";

const context: ColumnColorContext = {
  analysis: { parsimonyInformativeSites: [], conservedSites: [], variableSites: [] },
  columnStats: [],
  conservationThreshold: 0.9,
  columnScores: [0.25, 1],
  cellScores: [
    [0.5, 0.123],
    [0, 1],
  ],
};

describe("score colour styles", () => {
  it("are offered alongside the residue and analysis styles", () => {
    expect(COLOR_STYLES).toContain("Column score");
    expect(COLOR_STYLES).toContain("Cell score");
  });

  it("colour a column by its score", () => {
    expect(cellColor("A", 0, "Column score", context)).toBe(qualityGradient(0.25));
    expect(cellColor("A", 1, "Column score", context, true)).toBe(qualityGradient(1, true));
  });

  it("colour a cell by its own score, quantised to 1/100", () => {
    expect(cellColor("A", 0, "Cell score", context, false, 0)).toBe(qualityGradient(0.5));
    expect(cellColor("A", 1, "Cell score", context, false, 0)).toBe(qualityGradient(0.12));
  });

  it("fall back to the gap colour for gaps, the consensus row, and missing scores", () => {
    expect(cellColor("-", 0, "Cell score", context, false, 0)).toBe(GAP_COLOR.light);
    expect(cellColor("A", 0, "Cell score", context, false, -1)).toBe(GAP_COLOR.light);
    expect(cellColor("A", 5, "Column score", context)).toBe(GAP_COLOR.light);
    expect(cellColor("A", 0, "Column score", { ...context, columnScores: undefined })).toBe(GAP_COLOR.light);
  });
});
