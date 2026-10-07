import type { Sequence as BetulaSequence } from "betula-schema";

export type {
  Alignment,
  Annotation,
  BlastResult,
  DnaSequence,
  Hit,
  HitMember,
  Hsp,
  Metadata,
  ProteinSequence,
  RnaSequence,
  TaxonomyNode,
  Tree,
  UntypedSequence,
  WrappedAlignment,
} from "betula-schema";

/**
 * @public
 * One alignment row: a betula `Sequence` (`{ identifier, sequence }`, optionally with an alphabet
 * `type`), plus an optional react-bio-viz `id`.
 */
export type Sequence = BetulaSequence & {
  /**
   * Stable row identity used by `selection`, `rowOrder` and the editing callbacks. Defaults to
   * `identifier`; set it when identifiers can repeat, or when a row is renamed but should keep its
   * identity (e.g. an edit log keyed by the original identifier). Not part of the betula schema.
   */
  id?: string;
};
