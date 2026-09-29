import type { SequenceInterval } from "./types";

/** @public The mRNA features directly under a gene. */
export function getTranscripts(gene: SequenceInterval): SequenceInterval[] {
  return gene.children?.filter((child) => child.interval_type === "mRNA") ?? [];
}

/**
 * @public
 * The non-mRNA features of `gene` (exons, CDSs, UTRs, …) whose `parent` attribute names
 * `transcript`, in drawing order: CDSs last, so they paint over the exons they overlap.
 */
export function getTranscriptParts(gene: SequenceInterval, transcript: SequenceInterval): SequenceInterval[] {
  const parts = (gene.children ?? []).filter(
    (interval) => interval.interval_type !== "mRNA" && [interval.attributes.parent ?? []].flat().includes(transcript.ID)
  );
  const isCoding = (interval: SequenceInterval) => (interval.interval_type === "CDS" ? 1 : 0);
  return parts.sort((a, b) => isCoding(a) - isCoding(b));
}
