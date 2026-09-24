import type { StoreController, Viewport } from "@react-bio-viz/core";

/** @public The heatmap palettes (acacia's): white fading to red, blue, green or black with distance. */
export type DistanceColorScheme = "warm" | "cool" | "green" | "grayscale";

/** @public Rendering toggles for {@link DistanceMatrix}. */
export interface DistanceMatrixOptions {
  /** Write each distance in its cell (once cells are large enough). @defaultValue true */
  showNumbers?: boolean;
  /** @defaultValue "warm" */
  colorScheme?: DistanceColorScheme;
  /** Cell size at the default zoom, in pixels. @defaultValue 44 × 22 */
  cellWidth?: number;
  cellHeight?: number;
  /** Show the pan/zoom button bar. @defaultValue true */
  showToolbar?: boolean;
  /** Show the row names. @defaultValue true */
  showLabels?: boolean;
  /** Let rows (and with them, columns) be reordered by dragging their labels. @defaultValue true */
  reorderableRows?: boolean;
  /** Render for a dark background. Defaults to the host's `dark` class, like every canvas here. */
  darkMode?: boolean;
}

/** @public The cell under the pointer. */
export interface DistanceMatrixHover {
  rowId: string;
  columnId: string;
  value: number;
  clientX: number;
  clientY: number;
}

/** @public Sizes of the user-resizable panels, in pixels. */
export interface DistanceMatrixPanelSizes {
  labelWidth: number;
}

/** @public */
export interface DistanceMatrixProps {
  /** Row/column identities, in `matrix` order. */
  labels: string[];
  /** Symmetric `labels.length` × `labels.length` distances. */
  matrix: readonly (readonly number[])[];
  /** Display text for a label id, when it differs from the id (e.g. a renamed sequence). */
  labelNames?: Record<string, string>;
  /** @defaultValue 650 */
  width?: number;
  /** @defaultValue 500 */
  height?: number;
  options?: DistanceMatrixOptions;

  /** Visible window in cells (x: columns, y: rows), fully controlled. */
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (next: Viewport) => void;
  viewportStore?: StoreController<Viewport>;

  /**
   * Display order of rows and columns, as label ids — the same shape as the MSA's `rowOrder`, so one
   * store can keep an alignment, a tree and this matrix in the same order.
   */
  rowOrder?: string[];
  defaultRowOrder?: string[];
  onRowOrderChange?: (next: string[]) => void;
  rowOrderStore?: StoreController<string[]>;

  panelSizes?: DistanceMatrixPanelSizes;
  defaultPanelSizes?: Partial<DistanceMatrixPanelSizes>;
  onPanelSizesChange?: (next: DistanceMatrixPanelSizes) => void;
  panelSizesStore?: StoreController<DistanceMatrixPanelSizes>;

  onHoverChange?: (hover: DistanceMatrixHover | null) => void;
}
