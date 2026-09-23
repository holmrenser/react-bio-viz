import type { StoreController, Viewport } from "@react-bio-viz/core";

/**
 * @public
 * Sequence interval object based on gff3 field specs. Recursively defined:
 * SequenceInterval children are SequenceIntervals themselves.
 */
export type SequenceInterval = {
  /** Unique identifier for the sequence interval */
  ID: string;
  /** Unique identifier of the sequence the interval belongs to */
  seqid: string;
  /** Source of the sequence interval, i.e. what tool was used to generate or which organisation provided the annotation */
  source: string;
  /** Type of interval following the sequence ontology, e.g. mRNA, CDS, or gene */
  interval_type: string;
  /** Start coordinate */
  start: number;
  /** End coordinate */
  end: number;
  /** Sequence interval confidence score */
  score: number | string;
  /** Sequence strand */
  strand: "+" | "-" | ".";
  /** Interval phase (only relevant for CDS features) */
  phase: 0 | 1 | 2 | ".";
  /**
   * Additional attributes (AKA gff3 column 9)
   * @example
   * ```json
   * {dbxref: ['InterPro:IPR002376','InterPro:IPR001555'], name:'PurN'}
   * ```
   */
  attributes: Record<string, string[] | string>;
  /**
   * Child sequence intervals of the current sequence interval. This makes that genemodels can be
   * represented as a Directed Acyclic Graph. A common representation is `gene` -\> `mRNA(s)` -\> `exon(s)`
   */
  children?: SequenceInterval[];
};

/** @public */
export interface GeneModelProps {
  /** Recursively defined gene model object: SequenceInterval children are also SequenceIntervals. */
  gene: SequenceInterval;
  /** Width in pixels of the rendered SVG element. @defaultValue 500 */
  width?: number;
  /** Seed string for the gene's color scheme. @defaultValue "42" */
  colorSeed?: string;
  /** Show a scalebar indicating genomic position. @defaultValue true */
  showScale?: boolean;
  /** Popover content for a clicked exon/CDS. @defaultValue shows all gff3 fields. */
  exonPopoverFn?: (arg0: SequenceInterval) => JSX.Element;
  /**
   * @deprecated Use `viewport`/`defaultViewport` instead. Percentage (0-100) along the x-axis
   * where the visualization should start; seeds `defaultViewport` when neither is given.
   */
  panMin?: number;
  /**
   * @deprecated Use `viewport`/`defaultViewport` instead. Percentage (0-100) along the x-axis
   * where the visualization should end; seeds `defaultViewport` when neither is given.
   */
  panMax?: number;
  /** The visible genomic-coordinate window, fully controlled. */
  viewport?: Viewport;
  /** Seeds the visible window when uncontrolled. Defaults to the full padded gene extent. */
  defaultViewport?: Viewport;
  /** Called on every pan/zoom, whether user- or programmatically-driven. */
  onViewportChange?: (next: Viewport) => void;
  /** Delegates viewport state to an external store instead of local state. */
  viewportStore?: StoreController<Viewport>;
}
