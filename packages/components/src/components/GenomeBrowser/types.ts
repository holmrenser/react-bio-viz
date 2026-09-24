import type { LinearScale, StoreController, Viewport } from "@react-bio-viz/core";

import type { SequenceInterval } from "../GeneModel/types";

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
  /** Pixel height for this track's lane. Defaults vary by `kind`. */
  height?: number;
}

/** @public A row of non-overlapping-when-possible interval features (auto-stacked when they overlap). */
export interface FeatureTrack extends BaseTrack {
  kind: "feature";
  data: GenomeFeature[];
}

/** @public A depth/signal profile drawn as a filled line chart. */
export interface CoverageTrack extends BaseTrack {
  kind: "coverage";
  data: CoveragePoint[];
}

/** @public A gene model (reuses `GeneModel`'s own `Transcript`/`Exon` rendering). */
export interface GeneModelTrack extends BaseTrack {
  kind: "genemodel";
  data: SequenceInterval;
}

/** @public @see {@link GenomeBrowserProps.tracks} */
export type GenomeTrack = FeatureTrack | CoverageTrack | GeneModelTrack;

/** @public Props every built-in and custom track renderer receives. */
export interface TrackRenderProps<T extends GenomeTrack = GenomeTrack> {
  track: T;
  /** Genome coordinate → pixel-x scale, already reflecting the current viewport. */
  scale: LinearScale;
  viewport: Viewport;
  /** Pixel width of the track's drawable area. */
  width: number;
  /** Pixel height allotted to this track. */
  height: number;
}

/** @public A render function for one track kind — the extensibility seam for custom track types. */
export type TrackRenderer = (props: TrackRenderProps) => JSX.Element | null;

/**
 * @public
 * @group Component props
 */
export interface GenomeBrowserProps {
  /** The tracks to render, top to bottom. */
  tracks: GenomeTrack[];
  /** Total length of the reference sequence — the full extent of the genomic coordinate axis. */
  referenceLength: number;
  /** Reference sequence name, shown on the position ruler. */
  referenceName?: string;
  /** Pixel width of the whole widget. @defaultValue 1000 */
  width?: number;
  /** Show a genomic-position ruler above the tracks. @defaultValue true */
  showScale?: boolean;
  /**
   * Overrides or adds track renderers by `kind`. Merged over the built-ins (`feature`, `coverage`,
   * `genemodel`), so a custom kind — or a replacement for a built-in one — is just one more entry.
   */
  trackRenderers?: Record<string, TrackRenderer>;
  /** The visible genomic-coordinate window, fully controlled. */
  viewport?: Viewport;
  /** Seeds the visible window when uncontrolled. Defaults to the full reference length. */
  defaultViewport?: Viewport;
  /** Called on every pan/zoom, whether user- or programmatically-driven. */
  onViewportChange?: (next: Viewport) => void;
  /** Delegates viewport state to an external store instead of local state. */
  viewportStore?: StoreController<Viewport>;
}
