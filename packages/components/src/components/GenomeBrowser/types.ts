import type { ReactNode } from "react";
import type { LinearScale, SequenceInterval, StoreController, Viewport } from "@react-bio-viz/core";

/** @public A single interval feature on a `"feature"` track (e.g. a BED/GFF-style annotation). */
export interface GenomeFeature {
  id: string;
  start: number;
  end: number;
  label?: string;
  color?: string;
  strand?: "+" | "-" | ".";
}

/** @public One sample in a `"coverage"` track's depth/signal profile. */
export interface CoveragePoint {
  position: number;
  value: number;
}

interface BaseTrack {
  id: string;
  label: string;
  /** Pixel height of the track. Defaults to what its `kind` needs. */
  height?: number;
}

/** @public Interval features, stacked into rows where they overlap. */
export interface FeatureTrack extends BaseTrack {
  kind: "feature";
  data: GenomeFeature[];
}

/** @public A depth/signal profile drawn as a filled line chart. */
export interface CoverageTrack extends BaseTrack {
  kind: "coverage";
  data: CoveragePoint[];
}

/** @public A gene model, drawn like `GeneModel`. */
export interface GeneModelTrack extends BaseTrack {
  kind: "genemodel";
  data: SequenceInterval;
}

/** @public One track of a {@link GenomeBrowser}. */
export type GenomeTrack = FeatureTrack | CoverageTrack | GeneModelTrack;

/** @public What every track renderer, built-in or custom, receives. */
export interface TrackRenderProps<T extends GenomeTrack = GenomeTrack> {
  track: T;
  /** Genome coordinate → pixel x, for the current viewport. */
  scale: LinearScale;
  viewport: Viewport;
  /** Pixel width of the track's drawable area. */
  width: number;
  /** Pixel height allotted to this track. */
  height: number;
}

/** @public Draws one kind of track: the extension point for custom track kinds. */
export type TrackRenderer = (props: TrackRenderProps) => ReactNode;

/**
 * @public
 * @group Component props
 */
export interface SimpleGenomeBrowserProps {
  /** The tracks to render, top to bottom. */
  tracks: GenomeTrack[];
  /** Length of the reference sequence: the full extent of the coordinate axis. */
  referenceLength: number;
  /** Reference sequence name, shown on the ruler. */
  referenceName?: string;
  /** Pixel width of the whole component. @defaultValue 1000 */
  width?: number;
  /** Show a genomic-position ruler above the tracks. @defaultValue true */
  showScale?: boolean;
  /**
   * Track renderers by `kind`, merged over the built-ins (`feature`, `coverage`, `genemodel`): add
   * a custom kind, or replace a built-in one.
   */
  trackRenderers?: Record<string, TrackRenderer>;
  /** The visible genomic window. @defaultValue the whole reference */
  viewport?: Viewport;
  /** Called with the next window on every pan/zoom. */
  onViewportChange?: (next: Viewport) => void;
}

/**
 * @public
 * @group Component props
 */
export interface GenomeBrowserProps extends SimpleGenomeBrowserProps {
  /** Seeds the visible window when uncontrolled. */
  defaultViewport?: Viewport;
  /** Keeps the visible window in an external store. */
  viewportStore?: StoreController<Viewport>;
}
