/** Default cell size, in pixels (acacia's distance grid). */
export const CELL_WIDTH = 44;
export const CELL_HEIGHT = 22;

/** Height of the rotated column-name header. */
export const HEADER_HEIGHT = 100;

/** Default width of the row-name column. */
export const LABEL_WIDTH = 160;

/** Limits for the resizable label column. */
export const LABEL_WIDTH_LIMITS = { min: 40, max: 600 } as const;

/** Thickness of the draggable divider between labels and cells. */
export const DIVIDER_SIZE = 6;

/** Height reserved for the pan/zoom toolbar. */
export const TOOLBAR_HEIGHT = 40;

/** Smallest cell (px) numbers are written into. */
export const NUMBER_MIN_CELL = { width: 28, height: 11 } as const;

/** Decimals shown for each distance. */
export const NUMBER_DECIMALS = 3;

/** Largest cell (px) zooming in can reach. */
export const MAX_CELL_SIZE = 120;

/** Fill of the diagonal (self-distance) cells. */
export const DIAGONAL_COLOR = { light: "#f4f4f4", dark: "#2a2a2a" } as const;
