export const CELL_SIZE = 16;

/** Width of the sequence-name gutter to the left of the alignment. */
export const LABEL_WIDTH = 150;

/** Height of the zoomed-out overview strip above the alignment. */
export const MINIMAP_HEIGHT = 50;

/** Height of each track below the alignment. */
export const TRACK_HEIGHT = 48;

/** How close to the viewport box's edge a pointer counts as "on the edge", for resize-to-zoom. */
export const MINIMAP_EDGE_ZONE = 8;

/** Height of the column ruler above the alignment. */
export const SCALEBAR_HEIGHT = 22;

/** Fill used for a residue that matches the highlight pattern. */
export const HIGHLIGHT_MATCH_COLOR = "#ffe000";

/** Share of a cell its colour fills once cells are big enough to show a gap between them (acacia's look). */
export const CELL_FILL_RATIO = 0.95;

/** Cell size (px) from which the gap between cells is drawn. */
export const CELL_GAP_MIN_SIZE = 6;

/** Below this cell size (px, either axis) the renderer samples per pixel instead of filling cells. */
export const PIXEL_MODE_MAX_CELL_SIZE = 2;

/** Smallest cell (px) a residue letter is drawn in. */
export const LETTER_MIN_CELL_WIDTH = 7;
export const LETTER_MIN_CELL_HEIGHT = 8;

/** Pointer travel (px) that turns a press into a drag rather than a click. */
export const CLICK_THRESHOLD_PX = 3;

/** Limits for the resizable panels, in pixels. */
export const PANEL_LIMITS = {
  labelWidth: { min: 40, max: 600 },
  trackHeight: { min: 16, max: 240 },
  minimapHeight: { min: 16, max: 300 },
} as const;

/** Label shown for the consensus row. */
export const CONSENSUS_LABEL = "Consensus";

/** Thickness of the draggable dividers between panels. */
export const DIVIDER_SIZE = 6;

/** Height reserved for the pan/zoom toolbar (32px buttons + margin). */
export const TOOLBAR_HEIGHT = 40;

/** Height reserved for the hovered-cell readout. */
export const BADGE_HEIGHT = 16;

/** Largest cell (px) zooming in can reach. */
export const MAX_CELL_SIZE = 64;
