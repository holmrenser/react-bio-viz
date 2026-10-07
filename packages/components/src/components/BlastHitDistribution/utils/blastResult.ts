import type { BlastResult } from "@react-bio-viz/core";

import type { BlastHit } from "../types";

/**
 * @public
 * Flattens a betula `BlastResult` (hits with nested HSPs) into one {@link BlastHit} per HSP, the
 * rows `BlastHitDistribution` draws. Pass `result.queryLen` as its `queryLength`. A row's `id` is
 * `${accession}-${hsp.num}`, and its `percentIdentity` is that HSP's, not the hit's best.
 */
export function blastHitsFromResult(result: BlastResult): BlastHit[] {
  return result.hits.flatMap((hit) =>
    hit.hsps.map((hsp) => ({
      id: `${hit.accession}-${hsp.num}`,
      queryId: result.queryId,
      subjectId: hit.accession,
      queryStart: hsp.queryFrom,
      queryEnd: hsp.queryTo,
      subjectStart: hsp.hitFrom,
      subjectEnd: hsp.hitTo,
      evalue: hsp.evalue,
      bitScore: hsp.bitScore,
      percentIdentity: (100 * hsp.identity) / hsp.alignLen,
    }))
  );
}
