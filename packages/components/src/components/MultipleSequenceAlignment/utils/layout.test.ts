import { describe, expect, it } from "vitest";

import { BADGE_HEIGHT, CELL_SIZE, DIVIDER_SIZE, LABEL_WIDTH, SCALEBAR_HEIGHT } from "../constants";
import { alignmentExtent, computeAlignmentLayout, defaultAlignmentViewport, resolvePanelSizes } from "./layout";

const panels = resolvePanelSizes(undefined);

describe("resolvePanelSizes", () => {
  it("fills in defaults, honouring the deprecated label width", () => {
    expect(resolvePanelSizes({ trackHeight: 30 }, 90)).toEqual({ labelWidth: 90, trackHeight: 30, minimapHeight: 50 });
    expect(resolvePanelSizes({ labelWidth: 70 }, 90).labelWidth).toBe(70);
  });
});

describe("computeAlignmentLayout", () => {
  it("gives the canvas what the label column and panels leave", () => {
    const layout = computeAlignmentLayout(1000, 650, 400, {}, panels);
    expect(layout.labelSpace).toBe(LABEL_WIDTH + DIVIDER_SIZE);
    expect(layout.mainWidth).toBe(650 - LABEL_WIDTH - DIVIDER_SIZE);
    const chrome = BADGE_HEIGHT + panels.minimapHeight + DIVIDER_SIZE + SCALEBAR_HEIGHT + CELL_SIZE;
    expect(layout.mainHeight).toBe(400 - chrome);
  });

  it("takes only the height a few rows need", () => {
    expect(computeAlignmentLayout(3, 650, 400, {}, panels).mainHeight).toBe(3 * CELL_SIZE);
  });

  it("reserves room for tracks and none for hidden panels", () => {
    const bare = { showMinimap: false, showScalebar: false, showConsensus: false, showCursorBadge: false };
    const withTracks = computeAlignmentLayout(1000, 650, 400, { ...bare, tracks: ["logo"] }, panels);
    expect(withTracks.mainHeight).toBe(400 - DIVIDER_SIZE - panels.trackHeight);
  });
});

describe("defaultAlignmentViewport", () => {
  it("shows the top-left corner at the default cell size", () => {
    const layout = computeAlignmentLayout(1000, 650, 400, {}, panels);
    const viewport = defaultAlignmentViewport(500, 1000, layout, CELL_SIZE);
    expect([viewport.x0, viewport.y0]).toEqual([0, 0]);
    expect(viewport.x1).toBeCloseTo(layout.mainWidth / CELL_SIZE);
    expect([viewport.xMax, viewport.yMax]).toEqual([500, 1000]);
  });

  it("extends a small alignment's extent to the canvas", () => {
    const layout = computeAlignmentLayout(3, 650, 400, {}, panels);
    expect(alignmentExtent(4, 3, layout, CELL_SIZE).xMax).toBeCloseTo(layout.mainWidth / CELL_SIZE);
  });
});
