import { describe, expect, it } from "vitest";

import { COVERAGE_TRACK_HEIGHT, FEATURE_ROW_HEIGHT, MARGIN, SCALE_HEIGHT, TRACK_GAP } from "../constants";
import type { FeatureTrack, GenomeTrack } from "../types";
import { layoutTracks, trackHeight } from "./trackLayout";

const features: FeatureTrack = {
  id: "f",
  label: "Features",
  kind: "feature",
  data: [
    { id: "a", start: 0, end: 100 },
    { id: "b", start: 50, end: 150 },
    { id: "c", start: 200, end: 300 },
  ],
};
const coverage: GenomeTrack = { id: "c", label: "Coverage", kind: "coverage", data: [] };

describe("trackHeight", () => {
  it("fits every row of overlapping features", () => {
    expect(trackHeight(features)).toBe(2 * FEATURE_ROW_HEIGHT);
  });

  it("keeps one row for an empty feature track", () => {
    expect(trackHeight({ ...features, data: [] })).toBe(FEATURE_ROW_HEIGHT);
  });

  it("prefers the track's own height", () => {
    expect(trackHeight({ ...coverage, height: 99 })).toBe(99);
  });
});

describe("layoutTracks", () => {
  it("stacks tracks below the ruler with a gap between them", () => {
    const { rows, totalHeight } = layoutTracks([features, coverage], true);
    const top = MARGIN.top + SCALE_HEIGHT;
    expect(rows.map((row) => row.y)).toEqual([top, top + 2 * FEATURE_ROW_HEIGHT + TRACK_GAP]);
    expect(totalHeight).toBe(rows[1].y + COVERAGE_TRACK_HEIGHT + MARGIN.bottom);
  });

  it("starts at the top margin without a ruler", () => {
    expect(layoutTracks([coverage], false).rows[0].y).toBe(MARGIN.top);
  });
});
