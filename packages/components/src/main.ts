/**
 * React components for biological data visualization
 *
 * @packageDocumentation
 */
import { injectStyleSheet } from "@react-bio-viz/core";
// Emitted as `dist/style.css` for hosts that prefer to load it themselves (SSR pages that must be
// styled before hydration, or a strict CSP without inline styles)…
import "@react-bio-viz/core/style.css";
// …and inlined, so that `import { PhyloTree } from "react-bio-viz"` alone is enough everywhere else.
import styles from "@react-bio-viz/core/style.css?inline";

injectStyleSheet(styles, "rbv-styles");

export {
  MultipleSequenceAlignment,
  SimpleMultipleSequenceAlignment,
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
  SimpleMultipleSequenceAlignmentProps,
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
export { DistanceMatrix, SimpleDistanceMatrix, distanceColor } from './components/DistanceMatrix';
export type {
  DistanceColorScheme,
  DistanceMatrixHover,
  DistanceMatrixOptions,
  DistanceMatrixPanelSizes,
  DistanceMatrixProps,
  SimpleDistanceMatrixProps,
} from './components/DistanceMatrix';
export { GeneModel, SimpleGeneModel } from './components/GeneModel';
export type { GeneModelProps, SimpleGeneModelProps } from './components/GeneModel';
export {
  PhyloTree,
  SimplePhyloTree,
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
  SimplePhyloTreeProps,
  LeafFn,
  ColorFn,
  LayoutMode,
  TreeSelection,
  TreeNodeInfo,
  TreeNodeStyle,
  TreeBranchStyle,
  HierarchyPointNode,
} from './components/PhyloTree';
export { GenomeBrowser, SimpleGenomeBrowser } from './components/GenomeBrowser';
export type {
  GenomeBrowserProps,
  SimpleGenomeBrowserProps,
  GenomeTrack,
  FeatureTrack,
  CoverageTrack,
  GeneModelTrack,
  GenomeFeature,
  CoveragePoint,
  TrackRenderer,
  TrackRenderProps,
} from './components/GenomeBrowser';
export { BlastHitDistribution, SimpleBlastHitDistribution, blastHitsFromResult } from './components/BlastHitDistribution';
export type {
  BlastHit,
  BlastHitDistributionProps,
  BlastMetric,
  HitSelection,
  SimpleBlastHitDistributionProps,
} from './components/BlastHitDistribution';
// From core: what driving a component's state, or building your own chrome around a Simple* view, needs.
export {
  alignmentSequences,
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
  ViewportToolbar,
} from '@react-bio-viz/core';
// The betula data types the components take in (`Tree` and `Sequence` are exported above).
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
  UntypedSequence,
  WrappedAlignment,
} from '@react-bio-viz/core';
export type {
  SequenceInterval,
  SerializeSvgOptions,
  SetValue,
  StoreController,
  Viewport,
  ViewportToolbarProps,
  ZustandLikeStore,
} from '@react-bio-viz/core';
