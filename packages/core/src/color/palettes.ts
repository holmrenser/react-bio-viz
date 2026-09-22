import { createCategoricalColorScale } from "./categoricalScale";

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
export const NUCLEOTIDES = ["A", "C", "G", "T", "N", "-", "?", "."] as const;

/** @public */
export type Nucleotide = (typeof NUCLEOTIDES)[number];

/** @public */
export type BioLetter = AminoAcid | Nucleotide;

function buildPolarityPalette(): Palette<BioLetter> {
  return new Map(
    AMINO_ACIDS.map((aa): [BioLetter, string] => {
      let color: string;
      if ("-?".indexOf(aa) >= 0) color = "#f0f0f0";
      else if (aa === "X") color = "grey";
      else if (aa === "*") color = "black";
      else if ("GAVLIFWMP".indexOf(aa) >= 0) color = "yellow";
      else if ("STCYNQ".indexOf(aa) >= 0) color = "green";
      else if ("DE".indexOf(aa) >= 0) color = "red";
      else if ("KRH".indexOf(aa) >= 0) color = "blue";
      else color = "white";
      return [aa, color];
    })
  );
}

function buildIndividualPalette(): Palette<BioLetter> {
  const scale = createCategoricalColorScale({ seed: "amino-acid-individual" });
  return new Map(
    AMINO_ACIDS.map((aa): [BioLetter, string] => {
      let color: string;
      if ("-?".indexOf(aa) >= 0) color = "#f0f0f0";
      else if (aa === "X") color = "grey";
      else if (aa === "*") color = "black";
      else color = scale(aa).base;
      return [aa, color];
    })
  );
}

/** @public */
export type SequencePaletteName = "polarity" | "individual";

/** @public Built-in amino-acid palettes, shared by any component that renders sequence letters. */
export const sequencePalettes: Map<SequencePaletteName, Palette<BioLetter>> = new Map([
  ["polarity", buildPolarityPalette()],
  ["individual", buildIndividualPalette()],
]);
