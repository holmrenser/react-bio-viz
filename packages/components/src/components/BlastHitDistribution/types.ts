import type { ReactNode } from "react";
import type { StoreController, Viewport } from "@react-bio-viz/core";

/** @public One row of tabular BLAST output (e.g. `outfmt 6`) against a single query sequence. */
export interface BlastHit {
  /** Unique identifier for this hit (e.g. `${queryId}-${subjectId}-${queryStart}`). */
  id: string;
  queryId: string;
  subjectId: string;
  /** Alignment start on the query, in the same coordinates as `queryLength`. */
  queryStart: number;
  /** Alignment end on the query. */
  queryEnd: number;
  subjectStart?: number;
  subjectEnd?: number;
  evalue: number;
  bitScore: number;
  /** 0–100. */
  percentIdentity: number;
}

/** @public The `BlastHit` field that colours the hits. */
export type BlastMetric = "evalue" | "bitScore" | "percentIdentity";

/** @public The selected hits, by `id`. */
export interface HitSelection {
  selectedHitIds: string[];
}

/**
 * @public
 * @group Component props
 */
export interface SimpleBlastHitDistributionProps {
  hits: BlastHit[];
  /** Length of the query sequence: the extent of the x-axis. */
  queryLength: number;
  /** Name shown on the ruler. */
  queryName?: string;
  /** Width in pixels. @defaultValue 800 */
  width?: number;
  /** Show a query-position ruler. @defaultValue true */
  showScale?: boolean;
  /** Which field colours the hits. @defaultValue "evalue" */
  metric?: BlastMetric;
  /** Popover content for a clicked hit. @defaultValue ids, coordinates and all three metrics */
  hitPopoverFn?: (hit: BlastHit) => ReactNode;
  /** The visible window along the query. @defaultValue the whole query */
  viewport?: Viewport;
  /** Called with the next window on every pan/zoom. */
  onViewportChange?: (next: Viewport) => void;
  /** The selected hits. @defaultValue none */
  selection?: HitSelection;
  /** Called with the next selection when a hit is clicked (which toggles it). */
  onSelectionChange?: (next: HitSelection) => void;
}

/**
 * @public
 * @group Component props
 */
export interface BlastHitDistributionProps extends SimpleBlastHitDistributionProps {
  /** Seeds the metric when uncontrolled. @defaultValue "evalue" */
  defaultMetric?: BlastMetric;
  /** Called when the metric selector changes. */
  onMetricChange?: (next: BlastMetric) => void;
  /** Keeps the metric in an external store. */
  metricStore?: StoreController<BlastMetric>;
  /** Seeds the visible window when uncontrolled. */
  defaultViewport?: Viewport;
  /** Keeps the visible window in an external store. */
  viewportStore?: StoreController<Viewport>;
  /** Seeds the selection when uncontrolled. */
  defaultSelection?: HitSelection;
  /** Keeps the selection in an external store. */
  selectionStore?: StoreController<HitSelection>;
}
