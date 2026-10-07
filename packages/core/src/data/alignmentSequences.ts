import type { Alignment } from "betula-schema";

import type { Sequence } from "./types";

/**
 * @public
 * The rows of a betula `Alignment`, which is either a bare array of sequences or
 * `{ type: "alignment", sequences }`.
 */
export function alignmentSequences(alignment: Alignment): Sequence[] {
  return Array.isArray(alignment) ? alignment : alignment.sequences;
}
