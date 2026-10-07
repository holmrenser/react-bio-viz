import type { Sequence, StoreController, Viewport } from "@react-bio-viz/core";

import type { ColorStyle } from "./utils/colorStyle";

export type { Sequence };

/** @public */
export type AlignedSequences = Sequence[];

/**
 * @public
 * Selected rows, by row id (see `id` on {@link Sequence}), and columns, as 0-based indices. Arrays,
 * not `Set`s, so a selection serialises as is.
 */
export interface MSASelection {
  rows: string[];
  columns: number[];
}

/** @public Sizes of the user-resizable panels, in pixels. */
export interface MSAPanelSizes {
  /** Width of the sequence-name column. */
  labelWidth: number;
  /** Height of each track below the alignment. */
  trackHeight: number;
  /** Height of the overview minimap. */
  minimapHeight: number;
}

/**
 * @public
 * A per-column track drawn below the alignment, sharing its horizontal pan/zoom:
 * - `"conservation"` — fraction of non-gap residues matching the column's consensus;
 * - `"logo"` — a sequence logo (letter height = frequency × information content);
 * - `{ label, scores }` — any externally computed 0–1 per-column score (TRIDENT, mean TCS, …).
 */
export type MSATrack = "conservation" | "logo" | { id?: string; label: string; scores: readonly number[] };

/** @public The cell under the pointer. */
export interface MSAHover {
  /** Display row (after `rowOrder`), or `null` over the consensus row. */
  row: number | null;
  /** Row id, or `null` over the consensus row. */
  rowId: string | null;
  /** Row name as displayed (`"Consensus"` over the consensus row). */
  label: string;
  /** 0-based column. */
  col: number;
  residue: string;
  clientX: number;
  clientY: number;
}

/** @public Rendering options for {@link MultipleSequenceAlignment}. */
export interface MSADrawOptions {
  /** Pixel size of each residue cell at the default zoom. @defaultValue 16 */
  cellSize?: number;
  /**
   * Residue or column-analysis color scheme. Defaults to `"DNA"` or `"AA ClustalX"` depending on
   * what the alignment's alphabet looks like — see `detectSequenceType` in `@react-bio-viz/core`.
   */
  colorStyle?: ColorStyle;
  /** Draw the residue letter inside each cell (only once cells are large enough to read). @defaultValue true */
  showLetters?: boolean;
  /** Show the sequence-name column. @defaultValue true */
  showLabels?: boolean;
  /** @deprecated Use `defaultPanelSizes.labelWidth` (`MultipleSequenceAlignment` only). */
  labelWidth?: number;
  /** Show a majority-vote consensus row above the alignment. @defaultValue true */
  showConsensus?: boolean;
  /** Show an overview above the alignment: click to jump, drag to pan, drag an edge to zoom. @defaultValue true */
  showMinimap?: boolean;
  /** Show a column-position ruler above the alignment. @defaultValue true */
  showScalebar?: boolean;
  /** Show the pan/zoom toolbar (`MultipleSequenceAlignment` only). @defaultValue true */
  showToolbar?: boolean;
  /** Show the one-line readout of the hovered cell above the alignment. @defaultValue true */
  showCursorBadge?: boolean;
  /** Show a tooltip next to the pointer describing the hovered cell. @defaultValue true */
  showCursorTooltip?: boolean;
  /**
   * Highlight the residues matching this text (case-insensitively) — or, with `highlightUseRegex`,
   * this regular expression — and dim the rest. An invalid regex matches nothing.
   */
  highlightPattern?: string;
  /** Treat `highlightPattern` as a regular expression instead of a plain substring. @defaultValue false */
  highlightUseRegex?: boolean;
  /** Draw residues that match the consensus as `·`, so only the differences stand out. @defaultValue false */
  showOnlyDifferences?: boolean;
  /** Identity threshold (0–1) for the `"% Conserved"` color style. @defaultValue 0.9 */
  conservationThreshold?: number;
  /** Per-column 0–1 scores for the `"Column score"` color style. */
  columnScores?: readonly number[];
  /** Per-residue 0–1 scores for the `"Cell score"` color style, indexed `[row][column]` in `msa` order. */
  cellScores?: readonly (readonly number[])[];
  /** Tracks drawn below the alignment, top to bottom. Clicking a track selects columns. @defaultValue [] */
  tracks?: MSATrack[];
  /**
   * What a plain drag on the alignment does. In `"pan"` mode, Shift-drag (add) and Cmd/Ctrl-drag
   * (toggle) still select; in `"select"` mode a plain drag replaces the selection.
   * @defaultValue "pan"
   */
  interactionMode?: "pan" | "select";
  /** Which axis a drag/click on the alignment selects. @defaultValue "columns" */
  selectionAxis?: "rows" | "columns";
  /**
   * Axes that Ctrl/⌘-scroll (and trackpad pinch) zoom. `"columns"` keeps rows at a readable height
   * while zooming along the sequence. A plain scroll always pans. @defaultValue "both"
   */
  zoomAxes?: "both" | "columns";
  /** Let rows be reordered by dragging their labels (writes `rowOrder`). @defaultValue true */
  reorderableRows?: boolean;
  /** Render for a dark background. @defaultValue whether `<html>` has the `dark` class */
  darkMode?: boolean;
}

/**
 * @public
 * @group Component props
 */
export interface SimpleMultipleSequenceAlignmentProps {
  /** The alignment. All sequences must have the same length. */
  msa: AlignedSequences;
  /** Width in pixels. @defaultValue 650 */
  width?: number;
  /** Maximum height in pixels; an alignment with few rows takes less. @defaultValue 400 */
  height?: number;
  /** Rendering options — see {@link MSADrawOptions}. */
  options?: MSADrawOptions;
  /** The visible window, in columns and rows. @defaultValue the top-left corner at `cellSize` pixels per cell */
  viewport?: Viewport;
  /** Called with the next window on every pan/zoom. */
  onViewportChange?: (next: Viewport) => void;
  /** Selected rows and columns. @defaultValue nothing selected */
  selection?: MSASelection;
  /** Called on every selection change: a drag or click on the alignment, labels or tracks; Escape. */
  onSelectionChange?: (next: MSASelection) => void;
  /**
   * Display order of the rows, as row ids. Unknown ids are ignored and unlisted rows follow in `msa`
   * order, so a tree's leaf order can be passed as is. @defaultValue `msa` order
   */
  rowOrder?: string[];
  /** Called with the new order when a label is dragged. */
  onRowOrderChange?: (next: string[]) => void;
  /** Sizes of the label column, tracks and minimap. @defaultValue 150, 48 and 50 pixels */
  panelSizes?: MSAPanelSizes;
  /** Called while a panel divider is dragged. */
  onPanelSizesChange?: (next: MSAPanelSizes) => void;
  /**
   * Enables renaming a row (double-click its label, or the pencil on hover). The alignment isn't
   * edited: apply the rename to your data and pass it back.
   */
  onRenameRow?: (rowId: string, name: string) => void;
  /** Enables removing rows: the × on a hovered label, and Delete on selected rows. Never called with every row. */
  onRemoveRows?: (rowIds: string[]) => void;
  /** Enables removing selected columns with Delete. Never called with every column. */
  onRemoveColumns?: (columns: number[]) => void;
  /** Called as the pointer moves over the alignment (`null` when it leaves). */
  onHoverChange?: (hover: MSAHover | null) => void;
}

/**
 * @public
 * @group Component props
 */
export interface MultipleSequenceAlignmentProps extends SimpleMultipleSequenceAlignmentProps {
  /** Seeds the visible window when uncontrolled. */
  defaultViewport?: Viewport;
  /** Keeps the visible window in an external store. */
  viewportStore?: StoreController<Viewport>;
  /** Seeds the selection when uncontrolled. */
  defaultSelection?: MSASelection;
  /** Keeps the selection in an external store. */
  selectionStore?: StoreController<MSASelection>;
  /** Seeds the row order when uncontrolled. */
  defaultRowOrder?: string[];
  /** Keeps the row order in an external store — e.g. one shared with a tree's leaf order. */
  rowOrderStore?: StoreController<string[]>;
  /** Seeds the panel sizes when uncontrolled; omitted sizes take their defaults. */
  defaultPanelSizes?: Partial<MSAPanelSizes>;
  /** Keeps the panel sizes in an external store. */
  panelSizesStore?: StoreController<MSAPanelSizes>;
}
