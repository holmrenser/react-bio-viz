import {
  GAP_COLOR,
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

/** @public Every color style {@link MultipleSequenceAlignment} accepts. */
export type ColorStyle = ResidueColorStyle | ColumnColorStyle;

/** @public All color styles, in the order the picker lists them. */
export const COLOR_STYLES: ColorStyle[] = [...RESIDUE_COLOR_STYLES, ...COLUMN_COLOR_STYLES];

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
 * it and color the whole column. One entry point so the canvas renderer never has to branch on
 * which kind of style is active.
 */
export function cellColor(
  char: string,
  col: number,
  style: ColorStyle,
  context: ColumnColorContext,
  darkMode = false
): string {
  return isColumnColorStyle(style)
    ? columnColor(col, style, context, darkMode)
    : residueColor(char, style, darkMode);
}
