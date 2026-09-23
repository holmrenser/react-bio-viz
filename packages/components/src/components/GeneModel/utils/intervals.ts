import type { SequenceInterval } from "../types";

/** Indexes a flat list of gff3 features by their `ID`, keeping duplicates (e.g. multi-line CDS). */
export function groupByID(intervals: SequenceInterval[]): Map<string, SequenceInterval[]> {
  const groups = new Map<string, SequenceInterval[]>();
  for (const interval of intervals) {
    const existing = groups.get(interval.ID);
    if (existing) existing.push(interval);
    else groups.set(interval.ID, [interval]);
  }
  return groups;
}

/** Every non-mRNA feature (exon, CDS, UTR, …) whose `parent` attribute names `transcript`. */
export function getTranscriptChildren({
  transcript,
  intervals,
}: {
  transcript: SequenceInterval;
  intervals: Map<string, SequenceInterval[]>;
}): SequenceInterval[] {
  const children: SequenceInterval[] = [];
  for (const group of intervals.values()) {
    for (const interval of group) {
      const intervalParents = interval.attributes.parent || [];
      if (intervalParents.indexOf(transcript.ID) >= 0 && interval.interval_type !== "mRNA") {
        children.push(interval);
      }
    }
  }
  return children;
}

/** The mRNA features directly under a gene. */
export function getTranscripts(gene: SequenceInterval): SequenceInterval[] {
  return gene.children?.filter((child) => child.interval_type === "mRNA") ?? [];
}
