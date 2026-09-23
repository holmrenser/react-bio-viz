import type { Palette } from "./palettes";

/**
 * @public
 * Neutral fill for gap characters (`-`). Light/dark pair, because canvas rendering can't fall back
 * to a CSS theme token the way SVG can — see {@link residueColor}'s `darkMode` argument.
 */
export const GAP_COLOR = { light: "#f4f4f4", dark: "#2a2a2a" } as const;

/** @public Fill for a character no scheme has an entry for. */
export const UNKNOWN_COLOR = { light: "#cccccc", dark: "#4a4a4a" } as const;

const DNA_N = { light: "#e0e0e0", dark: "#4a4a4a" } as const;

/** @public A residue-coloring scheme in both light and dark variants. */
export interface ColorScheme {
  light: Palette;
  dark: Palette;
}

function makeScheme(entries: [string, string][], darkOverrides: [string, string][]): ColorScheme {
  return {
    light: new Map(entries),
    dark: new Map([...entries, ...darkOverrides]),
  };
}

function sameColor(residues: string[], color: string): [string, string][] {
  return residues.map((residue) => [residue, color]);
}

/** @public Default nucleotide scheme: A/C/G/T in green/blue/orange/red. */
export const dnaScheme: ColorScheme = makeScheme(
  [
    ["A", "#4caf50"],
    ["C", "#2196f3"],
    ["G", "#ff9800"],
    ["T", "#f44336"],
    ["U", "#f44336"],
    ["N", DNA_N.light],
    ["-", GAP_COLOR.light],
  ],
  [
    ["N", DNA_N.dark],
    ["-", GAP_COLOR.dark],
  ]
);

/** @public Nucleotide scheme using ClustalX's traditional palette. */
export const dnaClustalXScheme: ColorScheme = makeScheme(
  [
    ["A", "#64F73F"],
    ["C", "#FF7070"],
    ["G", "#FFB340"],
    ["T", "#4AC7FF"],
    ["U", "#4AC7FF"],
    ["-", GAP_COLOR.light],
  ],
  [["-", GAP_COLOR.dark]]
);

/** @public Amino-acid scheme grouping residues by ClustalX/Jalview's physicochemical classes. */
export const aaClustalXScheme: ColorScheme = makeScheme(
  [
    ...sameColor(["A", "V", "F", "P", "M", "I", "L", "W"], "#80A0F0"),
    ...sameColor(["K", "R"], "#F01505"),
    ...sameColor(["D", "E"], "#C048C0"),
    ...sameColor(["N", "Q", "S", "T"], "#15C015"),
    ["C", "#F08080"],
    ["G", "#F09048"],
    ...sameColor(["H", "Y"], "#15A4A4"),
    ["-", GAP_COLOR.light],
  ],
  [["-", GAP_COLOR.dark]]
);

/** @public Amino-acid scheme grouping residues by Zappo physicochemical property. */
export const aaZappoScheme: ColorScheme = makeScheme(
  [
    ...sameColor(["I", "L", "V", "A", "M"], "#FFAFAF"),
    ...sameColor(["F", "W", "Y"], "#FFC800"),
    ...sameColor(["K", "R", "H"], "#6464FF"),
    ...sameColor(["D", "E"], "#FF0000"),
    ...sameColor(["S", "T", "N", "Q"], "#00DD00"),
    ...sameColor(["G", "P"], "#FF00FF"),
    ["C", "#FFFF00"],
    ["-", GAP_COLOR.light],
  ],
  [["-", GAP_COLOR.dark]]
);

/** @public Amino-acid scheme giving every residue its own spectral color (Taylor). */
export const aaTaylorScheme: ColorScheme = makeScheme(
  [
    ["A", "#CCFF00"],
    ["R", "#0000FF"],
    ["N", "#CC00FF"],
    ["D", "#FF0000"],
    ["C", "#FFFF00"],
    ["Q", "#FF00CC"],
    ["E", "#FF0066"],
    ["G", "#FF9900"],
    ["H", "#0066FF"],
    ["I", "#66FF00"],
    ["L", "#33FF00"],
    ["K", "#6600FF"],
    ["M", "#00FF00"],
    ["F", "#00FF66"],
    ["P", "#FFCC00"],
    ["S", "#FF3300"],
    ["T", "#FF6600"],
    ["W", "#00CCFF"],
    ["Y", "#00FFCC"],
    ["V", "#99FF00"],
    ["-", GAP_COLOR.light],
  ],
  [["-", GAP_COLOR.dark]]
);

/** @public The color styles that map a single residue character to a color. */
export const RESIDUE_COLOR_STYLES = [
  "DNA",
  "DNA ClustalX",
  "AA ClustalX",
  "AA Zappo",
  "AA Taylor",
] as const;

/** @public */
export type ResidueColorStyle = (typeof RESIDUE_COLOR_STYLES)[number];

const SCHEMES: Record<ResidueColorStyle, ColorScheme> = {
  DNA: dnaScheme,
  "DNA ClustalX": dnaClustalXScheme,
  "AA ClustalX": aaClustalXScheme,
  "AA Zappo": aaZappoScheme,
  "AA Taylor": aaTaylorScheme,
};

/** @public Whether a sequence reads as nucleotide or amino-acid data. */
export type SequenceType = "DNA" | "Protein";

/** @public The style each sequence type defaults to when none is chosen explicitly. */
export const DEFAULT_COLOR_STYLE: Record<SequenceType, ResidueColorStyle> = {
  DNA: "DNA",
  Protein: "AA ClustalX",
};

/**
 * @public
 * Looks up the color a residue character gets under `style`. Unknown characters fall back to the
 * gap color for a scheme that recognizes the alphabet, so an unexpected residue reads as "nothing
 * here" rather than as a real category.
 */
export function residueColor(char: string, style: ResidueColorStyle, darkMode = false): string {
  const scheme = SCHEMES[style];
  const mode = darkMode ? "dark" : "light";
  const gap = darkMode ? GAP_COLOR.dark : GAP_COLOR.light;
  if (!scheme) return darkMode ? UNKNOWN_COLOR.dark : UNKNOWN_COLOR.light;
  return scheme[mode].get(char.toUpperCase()) ?? gap;
}

/**
 * @public
 * A blue→red gradient over a 0–1 score, for any per-column or per-residue quality/conservation
 * metric. Desaturated and darkened in dark mode so it doesn't glare against a dark background.
 */
export function qualityGradient(score: number, darkMode = false): string {
  const clamped = Math.max(0, Math.min(1, score));
  const hue = 220 - clamped * 180;
  const saturation = darkMode ? 55 : 70;
  const lightness = darkMode ? 38 : 50;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const PROTEIN_ONLY = new Set(["E", "F", "I", "L", "P", "Q"]);

/**
 * @public
 * Guesses whether an alignment holds nucleotide or amino-acid sequences, by looking for residues
 * that only occur in the amino-acid alphabet. Used to pick a sensible default color style.
 */
export function detectSequenceType(sequences: readonly { sequence: string }[]): SequenceType {
  for (const { sequence } of sequences) {
    for (const char of sequence) {
      if (PROTEIN_ONLY.has(char.toUpperCase())) return "Protein";
    }
  }
  return "DNA";
}
