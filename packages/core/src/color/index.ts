export { createCategoricalColorScale } from "./categoricalScale";
export type { CategoricalColor, CategoricalColorScale, CategoricalColorScaleOptions } from "./categoricalScale";
export { createSequentialColorScale } from "./sequentialScale";
export type { SequentialColorScale, SequentialColorScaleOptions } from "./sequentialScale";
export {
  GAP_COLOR,
  UNKNOWN_COLOR,
  RESIDUE_COLOR_STYLES,
  DEFAULT_COLOR_STYLE,
  aaClustalXScheme,
  aaTaylorScheme,
  aaZappoScheme,
  dnaClustalXScheme,
  dnaScheme,
  detectSequenceType,
  qualityGradient,
  residueColor,
} from "./schemes";
export type { ColorScheme, ResidueColorStyle, SequenceType } from "./schemes";
export { AMINO_ACIDS, NUCLEOTIDES } from "./palettes";
export type { Palette, AminoAcid, Nucleotide, BioLetter } from "./palettes";
export { toRGBA } from "./rgba";
export type { RGBA } from "./rgba";
