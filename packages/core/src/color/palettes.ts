/** @public A named category → color lookup, generalized beyond any single component's domain. */
export type Palette<T extends string = string> = Map<T, string>;

/** @public */
export const AMINO_ACIDS = [
  "G", "A", "V", "L", "I", "F", "W", "M", "P", "S", "T", "C", "Y", "N", "Q", "D", "E", "K", "R", "H",
  "-", "?", "X", "*",
] as const;

/** @public */
export type AminoAcid = (typeof AMINO_ACIDS)[number];

/** @public */
export const NUCLEOTIDES = ["A", "C", "G", "T", "U", "N", "-", "?", "."] as const;

/** @public */
export type Nucleotide = (typeof NUCLEOTIDES)[number];

/** @public */
export type BioLetter = AminoAcid | Nucleotide;
