import type { ColumnStat } from "./msaAnalysis";

/** One stacked letter in a sequence-logo column, bottom-most (most frequent) last. */
export interface LogoLetter {
  char: string;
  /** Share of the column's total height (0–1). */
  height: number;
}

/**
 * A sequence-logo column: letter heights are frequency × information content, where information
 * content is `log2(alphabet) − Shannon entropy` over the non-gap residues, normalised to 0–1.
 * Letters are ordered least-frequent first so the most common residue sits on top of the stack's
 * base, matching acacia's logo track.
 */
export function logoColumn(stat: ColumnStat | undefined, alphabetSize: number): LogoLetter[] {
  if (!stat) return [];
  const entries = Object.entries(stat.counts);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return [];
  const entropy = entries.reduce((h, [, count]) => {
    const p = count / total;
    return h - p * Math.log2(p);
  }, 0);
  const maxInformation = Math.log2(alphabetSize);
  const information = maxInformation > 0 ? Math.max(0, maxInformation - entropy) / maxInformation : 0;
  return entries
    .sort((a, b) => a[1] - b[1])
    .map(([char, count]) => ({ char, height: (count / total) * information }));
}
