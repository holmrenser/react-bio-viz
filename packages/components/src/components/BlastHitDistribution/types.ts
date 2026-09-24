import type { StoreController, Viewport } from "@react-bio-viz/core";

/** @public One row of tabular BLAST output (e.g. `outfmt 6`), keyed against a single query sequence. */
export interface BlastHit {
  /** Unique identifier for this hit (e.g. `${queryId}-${subjectId}-${queryStart}`). */
  id: string;
  queryId: string;
  subjectId: string;
  /** Alignment start on the query, in the same coordinate space as `queryLength`. */
  queryStart: number;
  /** Alignment end on the query. */
  queryEnd: number;
  subjectStart?: number;
  subjectEnd?: number;
  evalue: number;
  bitScore: number;
  /** 0-100. */
  percentIdentity: number;
}

/** @public Which `BlastHit` field the color scale is driven by. */
export type BlastMetric = "evalue" | "bitScore" | "percentIdentity";

/**
 * @public
 * Which hits are selected, and (reserved for a future brush-to-select interaction) a selected
 * range along the query axis. Controllable like every other stateful prop in this library — see
 * `selection`/`defaultSelection`/`onSelectionChange`/`selectionStore`.
 */
export interface HitSelection {
  selectedHitIds: string[];
  /** Not yet written to by any built-in interaction; reserved for a future brush-to-select gesture. */
  brushRange?: [number, number];
}

/**
 * @public
 * @group Component props
 */
export interface BlastHitDistributionProps {
  hits: BlastHit[];
  /** Length of the query sequence; the x-axis extent. */
  queryLength: number;
  /** Name shown on the axis ruler. */
  queryName?: string;
  /** Width in pixels of the rendered SVG element. @defaultValue 800 */
  width?: number;
  /** Show a scalebar indicating query position. @defaultValue true */
  showScale?: boolean;
  /** Which field drives each hit's color, fully controlled. */
  metric?: BlastMetric;
  /** Seeds the metric when uncontrolled. @defaultValue "evalue" */
  defaultMetric?: BlastMetric;
  /** Called whenever the metric selector changes. */
  onMetricChange?: (next: BlastMetric) => void;
  /** Popover content for a clicked hit. @defaultValue shows queryId/subjectId/coordinates/all three metrics */
  hitPopoverFn?: (hit: BlastHit) => JSX.Element;
  /** The visible query-axis pan/zoom window, fully controlled. */
  viewport?: Viewport;
  /** Seeds the visible window when uncontrolled. Defaults to the full query extent. */
  defaultViewport?: Viewport;
  /** Called on every pan/zoom, whether user- or programmatically-driven. */
  onViewportChange?: (next: Viewport) => void;
  /** Delegates viewport state to an external store instead of local state. */
  viewportStore?: StoreController<Viewport>;
  /** Which hits are selected, fully controlled. */
  selection?: HitSelection;
  /** Seeds the selection when uncontrolled. Defaults to nothing selected. */
  defaultSelection?: HitSelection;
  /** Called on every selection change (clicking a hit toggles it). */
  onSelectionChange?: (next: HitSelection) => void;
  /** Delegates selection state to an external store instead of local state. */
  selectionStore?: StoreController<HitSelection>;
}
