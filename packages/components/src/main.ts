/**
 * React components for biological data visualization
 *
 * @packageDocumentation
 */
import "@react-bio-viz/core/style.css";

export { MultipleSequenceAlignment, COLOR_STYLES, COLOR_STYLE_GROUPS } from './components/MultipleSequenceAlignment';
export type {
  Sequence,
  MultipleSequenceAlignmentProps,
  AlignedSequences,
  MSADrawOptions,
  ColorStyle,
  ColumnColorStyle,
  ColumnAnalysis,
  ColumnStat,
} from './components/MultipleSequenceAlignment';
export { GeneModel } from './components/GeneModel';
export type { SequenceInterval, GeneModelProps } from './components/GeneModel';
export { PhyloTree } from './components/PhyloTree';
export type { Tree, PhyloTreeProps, LeafFn, ColorFn, LayoutMode, TreeSelection, HierarchyPointNode } from './components/PhyloTree';
export { GenomeBrowser } from './components/GenomeBrowser';
export type {
  GenomeBrowserProps,
  GenomeTrack,
  FeatureTrack,
  CoverageTrack,
  GeneModelTrack,
  GenomeFeature,
  CoveragePoint,
  TrackRenderer,
  TrackRenderProps,
} from './components/GenomeBrowser';
export { BlastHitDistribution } from './components/BlastHitDistribution';
export type { BlastHit, BlastHitDistributionProps, BlastMetric, HitSelection } from './components/BlastHitDistribution';
/*
 * The controllable-state seam, re-exported so a consumer who installs only `react-bio-viz` can
 * actually use it: plugging a component into your own store, or driving a controlled viewport,
 * needs these. `@react-bio-viz/core` remains the home for the full primitive set.
 */
export {
  createControllableStore,
  createZustandStoreController,
  clampToExtent,
  fitToExtent,
  panBy,
  zoomAt,
  zoomBy,
} from '@react-bio-viz/core';
export type { StoreController, Viewport } from '@react-bio-viz/core';
