import { describe, expect, it } from "vitest";

import {
  DEFAULT_COLOR_STYLE,
  GAP_COLOR,
  RESIDUE_COLOR_STYLES,
  aaClustalXScheme,
  detectSequenceType,
  qualityGradient,
  residueColor,
} from "./schemes";

describe("residueColor", () => {
  it("colors nucleotides under the DNA scheme", () => {
    expect(residueColor("A", "DNA")).toBe("#4caf50");
    expect(residueColor("T", "DNA")).toBe("#f44336");
  });

  it("is case-insensitive", () => {
    expect(residueColor("a", "DNA")).toBe(residueColor("A", "DNA"));
  });

  it("gives U the same color as T, so RNA renders like DNA", () => {
    expect(residueColor("U", "DNA")).toBe(residueColor("T", "DNA"));
  });

  it("groups ClustalX residue classes onto one color", () => {
    const hydrophobic = ["A", "V", "F", "P", "M", "I", "L", "W"];
    const colors = new Set(hydrophobic.map((r) => residueColor(r, "AA ClustalX")));
    expect(colors.size).toBe(1);
  });

  it("gives every Taylor residue its own color", () => {
    const residues = ["A", "R", "N", "D", "C", "Q", "E", "G", "H", "I"];
    const colors = new Set(residues.map((r) => residueColor(r, "AA Taylor")));
    expect(colors.size).toBe(residues.length);
  });

  it("returns the gap color for gaps", () => {
    expect(residueColor("-", "AA ClustalX")).toBe(GAP_COLOR.light);
    expect(residueColor("-", "AA ClustalX", true)).toBe(GAP_COLOR.dark);
  });

  it("falls back to the gap color for a residue the scheme has no entry for", () => {
    expect(residueColor("Z", "AA Zappo")).toBe(GAP_COLOR.light);
  });

  it("darkens the gap color in dark mode without changing residue colors", () => {
    expect(residueColor("-", "DNA", true)).toBe(GAP_COLOR.dark);
    expect(residueColor("A", "DNA", true)).toBe(residueColor("A", "DNA", false));
  });

  it("covers every declared style", () => {
    for (const style of RESIDUE_COLOR_STYLES) {
      expect(residueColor("A", style)).toMatch(/^#/);
    }
  });

  it("builds a dark palette that is a superset of the light one", () => {
    for (const key of aaClustalXScheme.light.keys()) {
      expect(aaClustalXScheme.dark.has(key)).toBe(true);
    }
  });
});

describe("detectSequenceType", () => {
  it("returns DNA for nucleotide-only sequences", () => {
    expect(detectSequenceType([{ sequence: "ACGTACGT" }, { sequence: "ACGT--GT" }])).toBe("DNA");
  });

  it("returns Protein once an amino-acid-only residue appears", () => {
    expect(detectSequenceType([{ sequence: "ACGT" }, { sequence: "ACGE" }])).toBe("Protein");
  });

  it("is case-insensitive", () => {
    expect(detectSequenceType([{ sequence: "acgq" }])).toBe("Protein");
  });

  it("returns DNA for an empty alignment", () => {
    expect(detectSequenceType([])).toBe("DNA");
  });

  it("pairs with a sensible default style for each type", () => {
    expect(DEFAULT_COLOR_STYLE.DNA).toBe("DNA");
    expect(DEFAULT_COLOR_STYLE.Protein).toBe("AA ClustalX");
  });
});

describe("qualityGradient", () => {
  it("runs blue at 0 to red at 1", () => {
    expect(qualityGradient(0)).toBe("hsl(220, 70%, 50%)");
    expect(qualityGradient(1)).toBe("hsl(40, 70%, 50%)");
  });

  it("clamps out-of-range scores", () => {
    expect(qualityGradient(-1)).toBe(qualityGradient(0));
    expect(qualityGradient(2)).toBe(qualityGradient(1));
  });

  it("desaturates and darkens in dark mode", () => {
    expect(qualityGradient(0.5, true)).toBe("hsl(130, 55%, 38%)");
  });
});
