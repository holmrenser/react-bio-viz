import type { StoreController, Viewport } from "@react-bio-viz/core";

/** @public Heatmap palettes: white fading to red, blue, green or black with distance. */
export type DistanceColorScheme = "warm" | "cool" | "green" | "grayscale";

/** @public Rendering options for {@link DistanceMatrix}. */
export interface DistanceMatrixOptions {
  /** Write each distance in its cell, once cells are large enough. @defaultValue true */
  showNumbers?: boolean;
  /** @defaultValue "warm" */
  colorScheme?: DistanceColorScheme;
  /** Cell width at the default zoom, in pixels. @defaultValue 44 */
  cellWidth?: number;
  /** Cell height at the default zoom, in pixels. @defaultValue 22 */
  cellHeight?: number;
  /** Show the pan/zoom toolbar (`DistanceMatrix` only). @defaultValue true */
  showToolbar?: boolean;
  /** Show the row names. @defaultValue true */
  showLabels?: boolean;
  /** Let rows (and with them, columns) be reordered by dragging their names. @defaultValue true */
  reorderableRows?: boolean;
  /** Render for a dark background. @defaultValue whether `<html>` has the `dark` class */
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

/**
 * @public
 * @group Component props
 */
export interface SimpleDistanceMatrixProps {
  /** Row/column ids, in `matrix` order. */
  labels: string[];
  /** Symmetric `labels.length` × `labels.length` distances. */
  matrix: readonly (readonly number[])[];
  /** Display text for a label id, where it differs from the id (e.g. a renamed sequence). */
  labelNames?: Record<string, string>;
  /** Width in pixels. @defaultValue 650 */
  width?: number;
  /** Maximum height in pixels; a small matrix takes less. @defaultValue 500 */
  height?: number;
  options?: DistanceMatrixOptions;
  /** The visible window, in cells (x: columns, y: rows). @defaultValue the top-left corner at the default cell size */
  viewport?: Viewport;
  /** Called with the next window on every pan/zoom. */
  onViewportChange?: (next: Viewport) => void;
  /**
   * Display order of rows and columns, as label ids. Unknown ids are ignored and unlisted rows follow
   * in `labels` order — the same shape as the MSA's `rowOrder`, so one store can order both.
   * @defaultValue `labels` order
   */
  rowOrder?: string[];
  /** Called with the new order when a row name is dragged. */
  onRowOrderChange?: (next: string[]) => void;
  /** Panel sizes. @defaultValue a 160px label column */
  panelSizes?: DistanceMatrixPanelSizes;
  /** Called while a panel divider is dragged. */
  onPanelSizesChange?: (next: DistanceMatrixPanelSizes) => void;
  /** Called as the pointer moves over the cells (`null` when it leaves). */
  onHoverChange?: (hover: DistanceMatrixHover | null) => void;
}

/**
 * @public
 * @group Component props
 */
export interface DistanceMatrixProps extends SimpleDistanceMatrixProps {
  /** Seeds the visible window when uncontrolled. */
  defaultViewport?: Viewport;
  /** Keeps the visible window in an external store. */
  viewportStore?: StoreController<Viewport>;
  /** Seeds the row order when uncontrolled. */
  defaultRowOrder?: string[];
  /** Keeps the row order in an external store — e.g. one shared with an alignment. */
  rowOrderStore?: StoreController<string[]>;
  /** Seeds the panel sizes when uncontrolled; omitted sizes take their defaults. */
  defaultPanelSizes?: Partial<DistanceMatrixPanelSizes>;
  /** Keeps the panel sizes in an external store. */
  panelSizesStore?: StoreController<DistanceMatrixPanelSizes>;
}
