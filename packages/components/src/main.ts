/**
 * React components for biological data visualization
 *
 * @packageDocumentation
 */
import "@react-bio-viz/core/style.css";

export {
  MultipleSequenceAlignment,
  COLOR_STYLES,
  COLOR_STYLE_GROUPS,
  analyseColumns,
  computeColumnStats,
  computeConsensus,
  computeConservationScores,
} from './components/MultipleSequenceAlignment';
export type {
  Sequence,
  MultipleSequenceAlignmentProps,
  AlignedSequences,
  MSADrawOptions,
  MSAHover,
  MSAPanelSizes,
  MSASelection,
  MSATrack,
  ColorStyle,
  ColumnColorStyle,
  ScoreColorStyle,
  ColumnAnalysis,
  ColumnStat,
} from './components/MultipleSequenceAlignment';
export { DistanceMatrix, distanceColor } from './components/DistanceMatrix';
export type {
  DistanceColorScheme,
  DistanceMatrixHover,
  DistanceMatrixOptions,
  DistanceMatrixPanelSizes,
  DistanceMatrixProps,
} from './components/DistanceMatrix';
export { GeneModel } from './components/GeneModel';
export type { SequenceInterval, GeneModelProps } from './components/GeneModel';
export {
  PhyloTree,
  REROOT_ID,
  applyTreeSelection,
  collapseBySupport,
  ladderizeOrder,
  leafOrder,
  midpointRoot,
  orderForLeafNames,
  parseNewick,
  rerootAbove,
  rotateOrder,
  toNewick,
} from './components/PhyloTree';
export type {
  Tree,
  PhyloTreeProps,
  LeafFn,
  ColorFn,
  LayoutMode,
  TreeSelection,
  TreeNodeInfo,
  TreeNodeStyle,
  TreeBranchStyle,
  HierarchyPointNode,
} from './components/PhyloTree';
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
  moveItem,
  resolveRowOrder,
  serializeSvg,
  svgToPng,
  clampToExtent,
  fitToExtent,
  panBy,
  zoomAt,
  zoomBy,
} from '@react-bio-viz/core';
export type { SerializeSvgOptions, StoreController, Viewport, ZustandLikeStore } from '@react-bio-viz/core';
