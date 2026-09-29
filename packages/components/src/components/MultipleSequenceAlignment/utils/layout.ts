import { clampToExtent, type Viewport } from "@react-bio-viz/core";

import {
  BADGE_HEIGHT,
  CELL_SIZE,
  DIVIDER_SIZE,
  LABEL_WIDTH,
  MINIMAP_HEIGHT,
  SCALEBAR_HEIGHT,
  TRACK_HEIGHT,
} from "../constants";
import type { MSADrawOptions, MSAPanelSizes } from "../types";

export interface AlignmentLayout {
  /** Width of the label column plus its divider; 0 without labels. */
  labelSpace: number;
  /** Size of the main alignment canvas. */
  mainWidth: number;
  mainHeight: number;
}

/** Panel sizes, from a partial seed and the deprecated `options.labelWidth`. */
export function resolvePanelSizes(seed: Partial<MSAPanelSizes> | undefined, legacyLabelWidth?: number): MSAPanelSizes {
  return {
    labelWidth: seed?.labelWidth ?? legacyLabelWidth ?? LABEL_WIDTH,
    trackHeight: seed?.trackHeight ?? TRACK_HEIGHT,
    minimapHeight: seed?.minimapHeight ?? MINIMAP_HEIGHT,
  };
}

/**
 * Pixel size of the main canvas: what `width` and `height` leave after the label column and the
 * panels above and below it. `height` is a maximum: a few rows take only the height they need.
 */
export function computeAlignmentLayout(
  numSeqs: number,
  width: number,
  height: number,
  options: MSADrawOptions,
  panelSizes: MSAPanelSizes
): AlignmentLayout {
  const {
    cellSize = CELL_SIZE,
    showLabels = true,
    showConsensus = true,
    showMinimap = true,
    showScalebar = true,
    showCursorBadge = true,
    tracks = [],
  } = options;
  const labelSpace = showLabels ? panelSizes.labelWidth + DIVIDER_SIZE : 0;
  const chrome =
    (showCursorBadge ? BADGE_HEIGHT : 0) +
    (showMinimap ? panelSizes.minimapHeight + DIVIDER_SIZE : 0) +
    (showScalebar ? SCALEBAR_HEIGHT : 0) +
    (showConsensus ? cellSize : 0) +
    (tracks.length > 0 ? DIVIDER_SIZE + tracks.length * panelSizes.trackHeight : 0);
  return {
    labelSpace,
    mainWidth: Math.max(cellSize, width - labelSpace),
    mainHeight: Math.max(cellSize, Math.min(numSeqs * cellSize, height - chrome)),
  };
}

/**
 * The pannable extent, in columns and rows: the alignment, or the canvas at the default cell size if
 * that is larger — a small alignment is drawn at a normal scale, not stretched to fill the canvas.
 */
export function alignmentExtent(numColumns: number, numSeqs: number, layout: AlignmentLayout, cellSize: number) {
  return {
    xMin: 0,
    xMax: Math.max(1, numColumns, layout.mainWidth / cellSize),
    yMin: 0,
    yMax: Math.max(1, numSeqs, layout.mainHeight / cellSize),
  };
}

/** The top-left corner at `cellSize` pixels per cell. */
export function defaultAlignmentViewport(
  numColumns: number,
  numSeqs: number,
  layout: AlignmentLayout,
  cellSize: number
): Viewport {
  const extent = alignmentExtent(numColumns, numSeqs, layout, cellSize);
  return clampToExtent({ x0: 0, x1: layout.mainWidth / cellSize, y0: 0, y1: layout.mainHeight / cellSize, ...extent });
}
