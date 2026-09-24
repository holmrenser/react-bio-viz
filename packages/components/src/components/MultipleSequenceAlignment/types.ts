import type { StoreController, Viewport } from "@react-bio-viz/core";

import type { ColorStyle } from "./utils/colorStyle";

/** @public */
export type Sequence = {
  /** Sequence identifier (e.g. from a FASTA header). */
  header: string;
  /** Arbitrary biological sequence (nucleotide, amino acid, etc.). */
  sequence: string;
  /**
   * Stable row identity used by `selection`, `rowOrder` and the editing callbacks. Defaults to
   * `header`; set it when headers can repeat, or when a row is renamed but should keep its identity
   * (e.g. an edit log keyed by the original header).
   */
  id?: string;
};

/** @public */
export type AlignedSequences = Sequence[];

/**
 * @public
 * Selected rows (by row id — see `id` on {@link Sequence}) and columns (0-based indices into the
 * alignment as passed). Plain arrays rather than `Set`s so the value serializes as-is into a
 * store or across the Jupyter bridge.
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

/**
 * @public
 * Rendering toggles for {@link MultipleSequenceAlignment}, consolidated into one options object
 * (rather than a growing pile of boolean props).
 */
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
  /** @deprecated Seed `defaultPanelSizes.labelWidth` (or control `panelSizes`) instead. */
  labelWidth?: number;
  /** Show a majority-vote consensus row above the alignment. @defaultValue true */
  showConsensus?: boolean;
  /** Show a zoomed-out overview/minimap above the alignment, interactive (click to jump, drag to pan, drag an edge to zoom). @defaultValue true */
  showMinimap?: boolean;
  /** Show a column-position ruler above the alignment. @defaultValue true */
  showScalebar?: boolean;
  /** Show the pan/zoom button bar. @defaultValue true */
  showToolbar?: boolean;
  /** Show the one-line readout of the hovered cell above the alignment. @defaultValue true */
  showCursorBadge?: boolean;
  /** Show a tooltip next to the pointer describing the hovered cell. @defaultValue true */
  showCursorTooltip?: boolean;
  /**
   * Highlight residues matching this text (case-insensitive substring) or, with
   * `highlightUseRegex`, this regular expression. When set, replaces normal per-residue coloring:
   * matches render bright, everything else is dimmed. An invalid regex matches nothing rather than throwing.
   */
  highlightPattern?: string;
  /** Treat `highlightPattern` as a regular expression instead of a plain substring. @defaultValue false */
  highlightUseRegex?: boolean;
  /** Replace residues that match the majority-vote consensus at their column with a `·`, so only differences stand out. @defaultValue false */
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
  /**
   * Render for a dark background. Canvas can't read CSS theme tokens, so this has to be an
   * explicit value; it defaults to whether the host has a `dark` class on `<html>`, the same
   * convention the shipped stylesheet uses.
   */
  darkMode?: boolean;
}

/**
 * @public
 * @group Component props
 */
export interface MultipleSequenceAlignmentProps {
  /** The alignment to render. All sequences must have the same length. */
  msa: AlignedSequences;
  /** Pixel width of the whole widget. @defaultValue 650 */
  width?: number;
  /** Maximum pixel height of the whole widget; an alignment with few rows takes less. @defaultValue 400 */
  height?: number;
  /** Rendering toggles — see {@link MSADrawOptions}. */
  options?: MSADrawOptions;

  /** The visible column/row window, fully controlled. */
  viewport?: Viewport;
  /** Seeds the visible column/row window when uncontrolled. Defaults to the top-left at `cellSize` pixels per cell. */
  defaultViewport?: Viewport;
  /** Called on every pan/zoom, whether user- or programmatically-driven. */
  onViewportChange?: (next: Viewport) => void;
  /** Delegates viewport state to an external store (e.g. a consumer's Zustand store) instead of local state. */
  viewportStore?: StoreController<Viewport>;

  /** Selected rows and columns, fully controlled. */
  selection?: MSASelection;
  /** Seeds the selection when uncontrolled. @defaultValue nothing selected */
  defaultSelection?: MSASelection;
  /** Called on every selection change (drag/click on the alignment, labels or tracks; Escape). */
  onSelectionChange?: (next: MSASelection) => void;
  /** Delegates selection state to an external store. */
  selectionStore?: StoreController<MSASelection>;

  /**
   * Display order of the rows, as row ids, fully controlled. Ids not in `msa` are ignored and rows
   * missing from it are appended in `msa` order — so a tree's leaf order can be passed as-is.
   */
  rowOrder?: string[];
  /** Seeds the row order when uncontrolled. @defaultValue `msa` order */
  defaultRowOrder?: string[];
  /** Called when a label is dragged to a new position. */
  onRowOrderChange?: (next: string[]) => void;
  /** Delegates row order to an external store (e.g. one shared with a tree's leaf order). */
  rowOrderStore?: StoreController<string[]>;

  /** Panel sizes (label column, tracks, minimap), fully controlled. */
  panelSizes?: MSAPanelSizes;
  /** Seeds panel sizes when uncontrolled. Partial: omitted sizes take their defaults. */
  defaultPanelSizes?: Partial<MSAPanelSizes>;
  /** Called while a panel divider is dragged. */
  onPanelSizesChange?: (next: MSAPanelSizes) => void;
  /** Delegates panel sizes to an external store. */
  panelSizesStore?: StoreController<MSAPanelSizes>;

  /**
   * Enables inline rename of a row label (double-click, or the pencil on hover). The component
   * never edits `msa` itself: apply the rename to your data (or edit log) and pass it back.
   */
  onRenameRow?: (rowId: string, name: string) => void;
  /**
   * Enables row removal: the × on a hovered label, and Delete/Backspace on selected rows. Never
   * called with every row — at least one always remains.
   */
  onRemoveRows?: (rowIds: string[]) => void;
  /**
   * Enables column removal with Delete/Backspace on selected columns. Never called with every
   * column — at least one always remains.
   */
  onRemoveColumns?: (columns: number[]) => void;
  /** Called as the pointer moves over the alignment (`null` when it leaves). */
  onHoverChange?: (hover: MSAHover | null) => void;
}
