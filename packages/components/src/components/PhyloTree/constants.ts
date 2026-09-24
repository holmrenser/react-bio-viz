/** Horizontal room reserved for leaf labels beyond the deepest tip, capped at 30% of the width. */
export const LABEL_WIDTH = 300;

/**
 * Padding around the tree surface. `right` is not used directly — the label allowance replaces it,
 * since that is the side a rectangular layout's tips point at.
 */
export const MARGIN = { top: 10, right: 10, bottom: 10, left: 20 } as const;

/** Vertical room reserved below the tree for the branch-length scale bar. */
export const SCALE_BAR_HEIGHT = 30;

/** Gap between the tree's scale bar and the bottom of the drawing area. */
export const SCALE_BAR_OFFSET = 10;

/** Gap between the outermost radius and a radial layout's leaf labels. */
export const RADIAL_LABEL_GAP = 12;

/** Pixel width the tree scale bar aims for before rounding to a nice branch length. */
export const SCALE_BAR_TARGET_PIXELS = 80;

/** Longest leaf label rendered before it is ellipsized (radial layout only). */
export const RADIAL_LABEL_MAX_CHARS = 24;

/** Opacity of a branch when support shading doesn't apply. */
export const DEFAULT_BRANCH_OPACITY = 0.9;

/** Width (px) of a branch's invisible click target, so thin branches are still easy to hit. */
export const BRANCH_HIT_WIDTH = 8;

/** Geometry of a collapsed clade's triangle and label, in pixels. */
export const COLLAPSED_TRIANGLE = {
  length: 24,
  minSpread: 8,
  spreadPerLeaf: 1.5,
  maxSpread: 28,
  labelGap: 6,
} as const;

/** Pointer travel (px) that turns a press on a node marker into a drag rather than a click. */
export const DRAG_THRESHOLD_PX = 3;

/** Default node-marker radius, in pixels. */
export const NODE_RADIUS = 4;

/** Default branch stroke width, in pixels. */
export const BRANCH_WIDTH = 0.75;

/** Default leaf label font size, in pixels. */
export const LABEL_FONT_SIZE = 11;
