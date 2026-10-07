import type { AlignedSequences, Annotation, Tree } from "react-bio-viz";

import genemodelJson from "../data/genemodel.json";
import msaJson from "../data/msa.json";
import treeJson from "../data/tree.json";

/** AUX/IAA family protein alignment (100 sequences × 1211 columns). */
export const msa = msaJson as AlignedSequences;
/** A maximum-likelihood tree with bootstrap support (41 leaves). */
export const tree = treeJson as unknown as Tree;
/** An Arabidopsis gene with its transcripts, exons and CDSs. */
export const gene = genemodelJson as unknown as Annotation;

/** Short display names: the accession, without the description FASTA headers carry. */
export function shortName(identifier: string): string {
  return identifier.split(" ")[0];
}

/**
 * The first `count` sequences with short names, restricted to columns where at least one of them
 * has a residue — a compact alignment for the examples that compute distances and a tree.
 */
export function subset(count: number): AlignedSequences {
  const rows = msa.slice(0, count).map((s) => ({ identifier: shortName(s.identifier), sequence: s.sequence }));
  const keep = rows[0].sequence.split("").map((_, col) => rows.some((row) => row.sequence[col] !== "-"));
  return rows.map((row) => ({ ...row, sequence: row.sequence.split("").filter((_, col) => keep[col]).join("") }));
}
