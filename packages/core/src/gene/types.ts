/**
 * @public
 * A GFF3 feature (gene, mRNA, exon, CDS, …) with its child features nested under `children`, so a
 * whole gene model is one tree: `gene` → `mRNA`s → `exon`s/`CDS`s.
 */
export type SequenceInterval = {
  /** Unique identifier (GFF3 `ID`). */
  ID: string;
  /** Identifier of the sequence the feature is on. */
  seqid: string;
  /** Tool or organisation that produced the annotation. */
  source: string;
  /** Sequence Ontology type, e.g. `"gene"`, `"mRNA"`, `"exon"`, `"CDS"`. */
  interval_type: string;
  start: number;
  end: number;
  score: number | string;
  strand: "+" | "-" | ".";
  /** Reading frame phase; only meaningful for CDS features. */
  phase: 0 | 1 | 2 | ".";
  /**
   * GFF3 column 9. A feature is attached to its transcript by `parent`.
   * @example
   * ```json
   * { "parent": ["mrna1"], "dbxref": ["InterPro:IPR002376"], "name": "PurN" }
   * ```
   */
  attributes: Record<string, string[] | string>;
  children?: SequenceInterval[];
};
