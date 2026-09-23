import { describe, expect, it } from "vitest";

import {
  analyseColumns,
  columnGapFractions,
  computeColumnStats,
  computeConsensus,
  computeConservationScores,
} from "./msaAnalysis";
import type { AlignedSequences } from "../types";

const msa: AlignedSequences = [
  { header: "a", sequence: "AAGT" },
  { header: "b", sequence: "ACGT" },
  { header: "c", sequence: "AC-T" },
];

describe("computeColumnStats", () => {
  it("picks the most frequent residue per column", () => {
    const stats = computeColumnStats(msa);
    expect(stats.map((s) => s.dominantChar)).toEqual(["A", "C", "G", "T"]);
  });

  it("scores against non-gap rows but computes identity against all rows", () => {
    const [, , gappyColumn] = computeColumnStats(msa);
    // Column 2 is G/G/- : both non-gap rows agree, but only 2 of 3 rows do.
    expect(gappyColumn.score).toBe(1);
    expect(gappyColumn.identity).toBeCloseTo(2 / 3);
  });

  it("counts residues case-insensitively", () => {
    const [first] = computeColumnStats([
      { header: "a", sequence: "a" },
      { header: "b", sequence: "A" },
    ]);
    expect(first.dominantChar).toBe("A");
    expect(first.counts.A).toBe(2);
  });

  it("returns an all-gap column as a gap with a zero score", () => {
    const [only] = computeColumnStats([
      { header: "a", sequence: "-" },
      { header: "b", sequence: "-" },
    ]);
    expect(only.dominantChar).toBe("-");
    expect(only.score).toBe(0);
  });

  it("returns an empty list for an empty alignment", () => {
    expect(computeColumnStats([])).toEqual([]);
  });
});

describe("computeConsensus", () => {
  it("joins the per-column dominant residues", () => {
    expect(computeConsensus(msa).sequence).toBe("ACGT");
  });

  it("is labelled Consensus so it renders like any other row", () => {
    expect(computeConsensus(msa).header).toBe("Consensus");
  });
});

describe("computeConservationScores", () => {
  it("returns one score per column", () => {
    expect(computeConservationScores(computeColumnStats(msa))).toHaveLength(4);
  });

  it("scores a fully conserved column at 1", () => {
    expect(computeConservationScores(computeColumnStats(msa))[0]).toBe(1);
  });
});

describe("analyseColumns", () => {
  it("classifies single-character columns as conserved", () => {
    expect(analyseColumns(msa).conservedSites).toEqual([0, 3]);
  });

  it("classifies multi-character columns as variable", () => {
    expect(analyseColumns(msa).variableSites).toEqual([1, 2]);
  });

  it("requires two states seen at least twice to call a column parsimony-informative", () => {
    // A appears 2x and T appears 2x — informative. The singleton G must not disqualify it.
    const informative: AlignedSequences = [
      { header: "a", sequence: "A" },
      { header: "b", sequence: "A" },
      { header: "c", sequence: "T" },
      { header: "d", sequence: "T" },
      { header: "e", sequence: "G" },
    ];
    expect(analyseColumns(informative).parsimonyInformativeSites).toEqual([0]);
  });

  it("does not call a column with a single repeated state informative", () => {
    const singleton: AlignedSequences = [
      { header: "a", sequence: "A" },
      { header: "b", sequence: "A" },
      { header: "c", sequence: "T" },
    ];
    expect(analyseColumns(singleton).parsimonyInformativeSites).toEqual([]);
  });

  it("returns empty categories for an empty alignment", () => {
    expect(analyseColumns([])).toEqual({
      parsimonyInformativeSites: [],
      conservedSites: [],
      variableSites: [],
    });
  });
});

describe("columnGapFractions", () => {
  it("reports the share of gapped rows per column", () => {
    expect(columnGapFractions(msa)).toEqual([0, 0, 1 / 3, 0]);
  });

  it("returns an empty list for an empty alignment", () => {
    expect(columnGapFractions([])).toEqual([]);
  });
});
