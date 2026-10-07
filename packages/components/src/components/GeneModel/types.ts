import type { ReactNode } from "react";
import type { Annotation, StoreController, Viewport } from "@react-bio-viz/core";

/**
 * @public
 * @group Component props
 */
export interface SimpleGeneModelProps {
  /** The gene, with its transcripts and their exons/CDSs nested under `children`. */
  gene: Annotation;
  /** Width in pixels. @defaultValue 500 */
  width?: number;
  /** Seeds the gene's colours. @defaultValue "42" */
  colorSeed?: string;
  /** Show a genomic-position ruler. @defaultValue true */
  showScale?: boolean;
  /** Popover content for a clicked exon/CDS. @defaultValue every GFF3 field */
  exonPopoverFn?: (interval: Annotation) => ReactNode;
  /** The visible genomic window. @defaultValue the gene plus 10% padding either side */
  viewport?: Viewport;
  /** Called with the next window on every pan/zoom. */
  onViewportChange?: (next: Viewport) => void;
}

/**
 * @public
 * @group Component props
 */
export interface GeneModelProps extends SimpleGeneModelProps {
  /** Seeds the visible window when uncontrolled. */
  defaultViewport?: Viewport;
  /** Keeps the visible window in an external store. */
  viewportStore?: StoreController<Viewport>;
  /**
   * @deprecated Use `defaultViewport`. Percentage (0–100) of the gene where the view starts; seeds
   * the window when neither `viewport` nor `defaultViewport` is given.
   */
  panMin?: number;
  /** @deprecated Use `defaultViewport`. Percentage (0–100) of the gene where the view ends. */
  panMax?: number;
}
