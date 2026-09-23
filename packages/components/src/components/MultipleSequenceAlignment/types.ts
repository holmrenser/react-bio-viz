import type { StoreController, Viewport } from "@react-bio-viz/core";

import type { ColorStyle } from "./utils/colorStyle";

/** @public */
export type Sequence = {
  /** Sequence identifier (e.g. from a FASTA header). */
  header: string;
  /** Arbitrary biological sequence (nucleotide, amino acid, etc.). */
  sequence: string;
};

/** @public */
export type AlignedSequences = Sequence[];

/**
 * @public
 * Rendering toggles for {@link MultipleSequenceAlignment}, consolidated into one options object
 * per the `bio-viz-conventions` project skill (rather than a growing pile of boolean props).
 */
export interface MSADrawOptions {
  /** Pixel size of each residue cell. @defaultValue 16 */
  cellSize?: number;
  /**
   * Residue or column-analysis color scheme. Defaults to `"DNA"` or `"AA ClustalX"` depending on
   * what the alignment's alphabet looks like — see `detectSequenceType` in `@react-bio-viz/core`.
   */
  colorStyle?: ColorStyle;
  /** Draw the residue letter inside each cell. @defaultValue true */
  showLetters?: boolean;
  /** Show the sequence-name column. @defaultValue true */
  showLabels?: boolean;
  /** Pixel width of the sequence-name column. @defaultValue 150 */
  labelWidth?: number;
  /** Show a majority-vote consensus row above the alignment. @defaultValue true */
  showConsensus?: boolean;
  /** Show a zoomed-out overview/minimap above the alignment, interactive (click to jump, drag to pan, drag an edge to zoom). @defaultValue true */
  showMinimap?: boolean;
  /** Show a column-position ruler above the alignment. @defaultValue true */
  showScalebar?: boolean;
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
  /**
   * Render for a dark background. Canvas can't read CSS theme tokens, so this has to be an
   * explicit value; it defaults to whether the host has a `dark` class on `<html>`, the same
   * convention the shipped stylesheet uses.
   */
  darkMode?: boolean;
}

/** @public */
export interface MultipleSequenceAlignmentProps {
  /** The alignment to render. */
  msa: AlignedSequences;
  /** Pixel width of the whole widget. @defaultValue 650 */
  width?: number;
  /** Pixel height of the whole widget. @defaultValue 400 */
  height?: number;
  /** Rendering toggles — see {@link MSADrawOptions}. */
  options?: MSADrawOptions;
  /** The visible column/row window, fully controlled. */
  viewport?: Viewport;
  /** Seeds the visible column/row window when uncontrolled. Defaults to fitting the widget's pixel area. */
  defaultViewport?: Viewport;
  /** Called on every pan/zoom, whether user- or programmatically-driven. */
  onViewportChange?: (next: Viewport) => void;
  /** Delegates viewport state to an external store (e.g. a consumer's Zustand store) instead of local state. */
  viewportStore?: StoreController<Viewport>;
}
