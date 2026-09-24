import type { BlastHit, CoverageTrack, FeatureTrack, GeneModelTrack, GenomeTrack } from "react-bio-viz";

import { gene as genemodel } from "./data";

/** Tracks around the example gene: repeats, a synthetic RNA-seq coverage profile, and the gene. */
export const genomeBrowserTracks: GenomeTrack[] = [
  {
    id: "repeats",
    label: "Repeats",
    kind: "feature",
    data: [
      { id: "r1", start: 35039800, end: 35040200, label: "LTR/Copia", color: "#c96" },
      { id: "r2", start: 35040100, end: 35040600, label: "LINE/L1", color: "#69c" },
      { id: "r3", start: 35043000, end: 35043500, label: "SINE", color: "#9c6" },
    ],
  } satisfies FeatureTrack,
  {
    id: "rnaseq",
    label: "RNA-seq",
    kind: "coverage",
    data: Array.from({ length: 40 }, (_, i) => {
      const position = 35039693 + i * 145;
      const inGene = position > 35039923 && position < 35045017;
      return { position, value: inGene ? 5 + 15 * Math.abs(Math.sin(i / 3)) : 0.5 };
    }),
  } satisfies CoverageTrack,
  { id: "gene", label: genemodel.attributes.name?.[0] ?? "Gene", kind: "genemodel", data: genemodel } satisfies GeneModelTrack,
];

export const blastHits: BlastHit[] = [
  { id: "hit-1", queryId: "query-1", subjectId: "Homo sapiens PON1", queryStart: 20, queryEnd: 480, evalue: 1e-120, bitScore: 410, percentIdentity: 98.2 },
  { id: "hit-2", queryId: "query-1", subjectId: "Mus musculus Pon1", queryStart: 400, queryEnd: 900, evalue: 1e-95, bitScore: 340, percentIdentity: 91.5 }, // overlaps hit-1
  { id: "hit-3", queryId: "query-1", subjectId: "Danio rerio pon1", queryStart: 950, queryEnd: 1300, evalue: 1e-40, bitScore: 180, percentIdentity: 76.3 },
  { id: "hit-4", queryId: "query-1", subjectId: "Drosophila melanogaster Pon1-like", queryStart: 1280, queryEnd: 1600, evalue: 1e-8, bitScore: 65, percentIdentity: 58.9 }, // overlaps hit-3
  { id: "hit-5", queryId: "query-1", subjectId: "Arabidopsis thaliana PON-like", queryStart: 1650, queryEnd: 1980, evalue: 1e-3, bitScore: 42, percentIdentity: 45.1 },
];

