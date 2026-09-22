/**
 * React components for biological data visualization
 * 
 * @packageDocumentation 
 */

export { MultipleSequenceAlignment } from './components/MultipleSequenceAlignment';
export type { Sequence, MultipleSequenceAlignmentProps, AlignedSequences } from './components/MultipleSequenceAlignment';
export { GeneModel } from './components/GeneModel';
export type { SequenceInterval, GeneModelProps } from './components/GeneModel';
export { PhyloTree } from './components/PhyloTree';
export type { Tree, PhyloTreeProps, LeafFn, ColorFn } from './components/PhyloTree';
export type { PaletteName } from './components/util';