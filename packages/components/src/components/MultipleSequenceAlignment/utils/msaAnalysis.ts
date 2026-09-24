import type { AlignedSequences, Sequence } from "../types";

const GAP = "-";

/** @public Per-column summary produced in a single pass over the alignment. */
export interface ColumnStat {
  /** The most frequent non-gap residue in the column (`"-"` when the column is all gaps). */
  dominantChar: string;
  /** Fraction of non-gap positions matching `dominantChar` (0–1). */
  score: number;
  /** Fraction of ALL rows matching `dominantChar`, gaps counted as mismatches (0–1). */
  identity: number;
  counts: Record<string, number>;
}

/** @public Which columns fall into each of the classic alignment-analysis categories. */
export interface ColumnAnalysis {
  parsimonyInformativeSites: number[];
  conservedSites: number[];
  variableSites: number[];
}

/**
 * @public
 * Single pass over every column, producing the consensus residue plus conservation figures.
 * Gaps are skipped when picking the dominant residue (so a mostly-gapped column is summarized by
 * the residues that are actually there) but still counted in `identity`, which is what makes a
 * gappy column score lower than a clean one.
 *
 * Written without intermediate per-column arrays: this runs over every cell of the alignment, so
 * allocation matters on large inputs.
 */
export function computeColumnStats(msa: AlignedSequences): ColumnStat[] {
  const rowCount = msa.length;
  const colCount = msa[0]?.sequence.length ?? 0;
  const stats = new Array<ColumnStat>(colCount);

  for (let col = 0; col < colCount; col += 1) {
    const counts: Record<string, number> = {};
    let nonGapTotal = 0;
    let dominantChar = GAP;
    let dominantCount = 0;

    for (let row = 0; row < rowCount; row += 1) {
      const char = msa[row].sequence[col];
      if (char === undefined || char === GAP) continue;
      const upper = char.toUpperCase();
      const next = (counts[upper] = (counts[upper] ?? 0) + 1);
      nonGapTotal += 1;
      if (next > dominantCount) {
        dominantCount = next;
        dominantChar = upper;
      }
    }

    stats[col] = {
      dominantChar,
      score: nonGapTotal === 0 ? 0 : dominantCount / nonGapTotal,
      identity: rowCount === 0 ? 0 : dominantCount / rowCount,
      counts,
    };
  }
  return stats;
}

/** @public The majority-vote consensus row, as a `Sequence` that can be rendered like any other. */
export function computeConsensus(msa: AlignedSequences, stats = computeColumnStats(msa)): Sequence {
  return { header: "Consensus", sequence: stats.map((stat) => stat.dominantChar).join("") };
}

/** @public Per-column conservation score (fraction of non-gap residues matching the dominant one). */
export function computeConservationScores(stats: ColumnStat[]): number[] {
  return stats.map((stat) => stat.score);
}

/**
 * @public
 * Classifies every column as conserved (one character throughout), variable (more than one), and
 * parsimony-informative (at least two characters each appearing at least twice — the columns that
 * can actually discriminate between topologies).
 */
export function analyseColumns(msa: AlignedSequences): ColumnAnalysis {
  const rowCount = msa.length;
  const colCount = msa[0]?.sequence.length ?? 0;
  const analysis: ColumnAnalysis = {
    parsimonyInformativeSites: [],
    conservedSites: [],
    variableSites: [],
  };

  for (let col = 0; col < colCount; col += 1) {
    const counts: Record<string, number> = {};
    for (let row = 0; row < rowCount; row += 1) {
      const char = msa[row].sequence[col];
      if (char === undefined) continue;
      counts[char] = (counts[char] ?? 0) + 1;
    }
    const distinct = Object.keys(counts);
    if (distinct.length <= 1) {
      analysis.conservedSites.push(col);
    } else {
      analysis.variableSites.push(col);
      if (distinct.filter((char) => counts[char] > 1).length >= 2) {
        analysis.parsimonyInformativeSites.push(col);
      }
    }
  }
  return analysis;
}

/** Per-column gap fraction (0–1): the share of rows whose residue in that column is a gap. */
export function columnGapFractions(msa: AlignedSequences): number[] {
  const rowCount = msa.length;
  if (rowCount === 0) return [];
  const colCount = msa[0].sequence.length;
  const out = new Array<number>(colCount).fill(0);
  for (let col = 0; col < colCount; col += 1) {
    let gaps = 0;
    for (let row = 0; row < rowCount; row += 1) {
      if (msa[row].sequence[col] === GAP) gaps += 1;
    }
    out[col] = gaps / rowCount;
  }
  return out;
}
