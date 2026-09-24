import {
  GAP_COLOR,
  qualityGradient,
  RESIDUE_COLOR_STYLES,
  residueColor,
  type ResidueColorStyle,
  type SequenceType,
} from "@react-bio-viz/core";

import type { ColumnAnalysis, ColumnStat } from "./msaAnalysis";

/** @public Column-uniform styles: every cell in a column takes the same color. */
export const COLUMN_COLOR_STYLES = [
  "Parsimony Informative",
  "Conserved",
  "% Conserved",
  "Variable",
] as const;

/** @public */
export type ColumnColorStyle = (typeof COLUMN_COLOR_STYLES)[number];

/**
 * @public
 * Styles that tint cells by an externally computed 0–1 quality score (blue → red, via
 * `qualityGradient`): `"Column score"` reads `MSADrawOptions.columnScores` (one per column, e.g.
 * TRIDENT), `"Cell score"` reads `MSADrawOptions.cellScores` (one per residue, e.g. TCS). The
 * library doesn't compute these scores — they are expensive and algorithm-specific — it only
 * renders them. Without scores, cells fall back to the gap colour.
 */
export const SCORE_COLOR_STYLES = ["Column score", "Cell score"] as const;

/** @public */
export type ScoreColorStyle = (typeof SCORE_COLOR_STYLES)[number];

/** @public Every color style {@link MultipleSequenceAlignment} accepts. */
export type ColorStyle = ResidueColorStyle | ColumnColorStyle | ScoreColorStyle;

/** @public All color styles, in the order the picker lists them. */
export const COLOR_STYLES: ColorStyle[] = [...RESIDUE_COLOR_STYLES, ...COLUMN_COLOR_STYLES, ...SCORE_COLOR_STYLES];

/**
 * @public
 * The color styles grouped for a picker: which alphabet each group applies to (`null` for the
 * analysis group, which works on any alignment).
 */
export const COLOR_STYLE_GROUPS: {
  label: string;
  styles: ColorStyle[];
  type: SequenceType | null;
}[] = [
  { label: "DNA", styles: ["DNA", "DNA ClustalX"], type: "DNA" },
  { label: "Amino Acid", styles: ["AA ClustalX", "AA Zappo", "AA Taylor"], type: "Protein" },
  { label: "Analysis", styles: [...COLUMN_COLOR_STYLES], type: null },
  { label: "Quality", styles: [...SCORE_COLOR_STYLES], type: null },
];

const COLUMN_STYLE_SET: ReadonlySet<string> = new Set(COLUMN_COLOR_STYLES);

/** Whether `style` colors whole columns rather than individual residues. */
export function isColumnColorStyle(style: ColorStyle): style is ColumnColorStyle {
  return COLUMN_STYLE_SET.has(style);
}

/** Highlight fill for a column an analysis style has selected. */
const HIGHLIGHT_COLOR = "royalblue";

/** Everything a column-uniform style needs to decide a column's color. */
export interface ColumnColorContext {
  analysis: ColumnAnalysis;
  columnStats: ColumnStat[];
  /** Identity threshold (0–1) for the `"% Conserved"` style. */
  conservationThreshold: number;
  /** Per-column 0–1 scores for `"Column score"`. */
  columnScores?: readonly number[];
  /** Per-residue 0–1 scores for `"Cell score"`, indexed `[row][column]` in `msa` order. */
  cellScores?: readonly (readonly number[])[];
}

/**
 * Scores are quantised to 1/100 before colouring: indistinguishable on screen, and it keeps the
 * number of distinct colours (and so the renderer's palette) small.
 */
function scoreColor(score: number | undefined, darkMode: boolean): string | null {
  if (score === undefined || !Number.isFinite(score)) return null;
  return qualityGradient(Math.round(Math.max(0, Math.min(1, score)) * 100) / 100, darkMode);
}

/** Color for column `col` under a column-uniform `style`. */
export function columnColor(
  col: number,
  style: ColumnColorStyle,
  context: ColumnColorContext,
  darkMode: boolean
): string {
  const gap = darkMode ? GAP_COLOR.dark : GAP_COLOR.light;
  switch (style) {
    case "Parsimony Informative":
      return context.analysis.parsimonyInformativeSites.includes(col) ? HIGHLIGHT_COLOR : gap;
    case "Variable":
      return context.analysis.variableSites.includes(col) ? HIGHLIGHT_COLOR : gap;
    case "Conserved":
      return context.analysis.conservedSites.includes(col) ? HIGHLIGHT_COLOR : gap;
    case "% Conserved":
      return (context.columnStats[col]?.identity ?? 0) >= context.conservationThreshold
        ? HIGHLIGHT_COLOR
        : gap;
  }
}

/**
 * The fill for one alignment cell: residue schemes look the character up, analysis styles ignore
 * it and color the whole column, score styles read the caller's scores. One entry point so the
 * canvas renderer never has to branch on which kind of style is active.
 *
 * `row` is the cell's index in `msa` order, or `-1` for a row with no per-residue scores (the
 * consensus row) — which, like a gap, has no `"Cell score"` and takes the gap colour.
 */
export function cellColor(
  char: string,
  col: number,
  style: ColorStyle,
  context: ColumnColorContext,
  darkMode = false,
  row = -1
): string {
  const gap = darkMode ? GAP_COLOR.dark : GAP_COLOR.light;
  if (style === "Column score") return scoreColor(context.columnScores?.[col], darkMode) ?? gap;
  if (style === "Cell score") {
    if (row < 0 || char === "-") return gap;
    return scoreColor(context.cellScores?.[row]?.[col], darkMode) ?? gap;
  }
  return isColumnColorStyle(style)
    ? columnColor(col, style, context, darkMode)
    : residueColor(char, style, darkMode);
}
