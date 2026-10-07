import type { StoreController, Tree, Viewport } from "@react-bio-viz/core";

// The betula `Tree`, which is also what `parseNewick` returns. Its optional `id` is the node's stable
// identity for selections and styles; without one, a node is identified by its position in the tree.
export type { Tree };

/**
 * @public
 * A node of the laid-out tree: the source {@link Tree} data, parent/children links, a stable `id`
 * (as used by {@link TreeSelection}) and the pixel position the layout gave it.
 */
export type HierarchyPointNode<T> = {
  /** `data.id` when present, else a positional path (stable across renders, not across re-sorts). */
  id: string;
  data: T;
  parent: HierarchyPointNode<T> | null;
  children?: HierarchyPointNode<T>[];
  depth: number;
  /** Spread-axis position (rendered as the vertical position). */
  x: number;
  /** Depth-axis position (rendered as the horizontal position). */
  y: number;
  /** Distance from the centre, in pixels. Populated by `"radial"` only. */
  radius?: number;
  /** Angle in radians, 0 pointing right. Populated by `"radial"` only. */
  angle?: number;
  /** For a collapsed clade drawn as a single tip: how many leaves it hides. */
  collapsedLeafCount?: number;
};

/** What a layout reports about its geometry, for what is drawn around it (scale bar, radial labels). */
export interface LayoutResult {
  /**
   * Pixels per branch-length unit, so the scale bar can label a real distance. Absent for
   * `"cladogram"`, which ignores branch length entirely.
   */
  scalingFactor?: number;
  /** Centre of the circle. Radial only. */
  center?: { cx: number; cy: number };
  /** Radius the outermost tip sits at. Radial only. */
  maxRadius?: number;
}

/** @public Renders a leaf's label, drawn at the label position. */
export type LeafFn = (props: { node: HierarchyPointNode<Tree>; fontSize?: number }) => React.JSX.Element;

/** @public Maps a leaf to the string that seeds its marker colour (leaves with equal strings share a colour). */
export type ColorFn = (node: HierarchyPointNode<Tree>) => string;

/**
 * @public
 * `rectangular` scales branches by length (a phylogram); `cladogram` ignores branch lengths and
 * aligns every tip flush at the right edge, regardless of topology imbalance; `radial` is a
 * circular phylogram, with leaves spread over a full turn.
 */
export type LayoutMode = "rectangular" | "cladogram" | "radial";

/**
 * @public
 * Where the tree is rooted, which clades are collapsed, and how siblings are ordered. Ids are those
 * of the tree as passed in, and stay valid across reroots.
 */
export interface TreeSelection {
  /**
   * `id` of the node whose *branch* (the edge to its parent) holds the root — a new bifurcating root
   * is inserted on it — or undefined for the tree's own root. See also {@link midpointRoot}.
   */
  rerootedAt?: string;
  /**
   * Where on that branch the root sits, as a fraction from the node (0) to its parent (1).
   * @defaultValue 0.5
   */
  rerootPosition?: number;
  /** `id`s of internal nodes whose clades are drawn collapsed, as a triangle. */
  collapsed: string[];
  /**
   * Maps a node's `id` to a reordered sequence of its children's `id`s, overriding the source
   * data's sibling order (set by dragging a node, or by {@link ladderizeOrder}/{@link rotateOrder}/
   * {@link orderForLeafNames}).
   */
  order?: Record<string, string[]>;
}

/** @public What a node or branch click reports about the node (for a branch: the node below it). */
export interface TreeNodeInfo {
  id: string;
  name: string;
  /** A tip of the displayed tree that is not a collapsed clade. */
  isLeaf: boolean;
  isRoot: boolean;
  isCollapsed: boolean;
  /** Length of the branch above the node. */
  length: number;
  /** The internal node's numeric label (bootstrap support), if it has one. */
  support?: number;
  /** Every leaf below the node (the node's own name, for a leaf). */
  leafNames: string[];
  /** The node and all its descendants — e.g. to style a whole clade in `nodeStyles`/`branchStyles`. */
  descendantIds: string[];
  /**
   * Spread into the selection to reroot halfway along the branch drawn above this node (`null` for
   * the root) — correct even when the tree is already rerooted; see {@link rerootAbove}.
   */
  rerootAbove: Pick<TreeSelection, "rerootedAt" | "rerootPosition"> | null;
  clientX: number;
  clientY: number;
}

/** @public Per-node styling, keyed by node `id` in {@link PhyloTreeProps.nodeStyles}. */
export interface TreeNodeStyle {
  /** Colour of the node marker and, for a leaf, its label. */
  color?: string;
  /** Bold leaf label. */
  bold?: boolean;
}

/** @public Per-branch styling, keyed by the `id` of the node below the branch. */
export interface TreeBranchStyle {
  color?: string;
}

/**
 * @public
 * @group Component props
 */
export interface SimplePhyloTreeProps {
  /** The tree: a root node with its descendants nested under `children`. */
  tree: Tree;
  /** Height in pixels. @defaultValue 900 */
  height?: number;
  /** Width in pixels. @defaultValue 1000 */
  width?: number;
  /** Layout — see {@link LayoutMode}. @defaultValue "rectangular" */
  layout?: LayoutMode;
  /** Label internal nodes with their name (typically bootstrap support). @defaultValue true */
  showSupportValues?: boolean;
  /** Only label support values at or above this value. @defaultValue 0 */
  supportThreshold?: number;
  /** Fade branches whose parent's support (a 0–1 value) is low. @defaultValue true */
  shadeBranchBySupport?: boolean;
  /** Seeds each leaf marker's colour; `nodeStyles` overrides it. @defaultValue the leaf name minus its last word */
  colorFunction?: ColorFn;
  /** One colour for every leaf marker (e.g. `"currentColor"`) instead of `colorFunction`'s. */
  leafMarkerColor?: string;
  /** Font size of support-value labels, in pixels. @defaultValue 10 */
  fontSize?: number;
  /** Align leaf labels in one column rather than right after each branch. @defaultValue true */
  alignTips?: boolean;
  /** Renders each leaf label. @defaultValue the leaf's name */
  leafTextComponent?: LeafFn;
  /**
   * Show internal-node markers that toggle `selection.collapsed` (or call `onNodeClick`), and let
   * nodes be dragged among their siblings (see `dragEnabled`). @defaultValue false
   */
  interactive?: boolean;
  /**
   * Bold the leaves whose name contains this text (case-insensitively) — or, with `searchUseRegex`,
   * matches this regular expression — and dim the rest. An invalid regex matches nothing.
   */
  searchQuery?: string;
  /** Treat `searchQuery` as a regular expression. @defaultValue false */
  searchUseRegex?: boolean;
  /** Show a branch-length scale bar (not in `"cladogram"` layout). @defaultValue true */
  showScaleBar?: boolean;
  /** Label every branch with its length. @defaultValue false */
  showBranchLengths?: boolean;
  /** Branch stroke width, in pixels. @defaultValue 0.75 */
  branchWidth?: number;
  /** Radius of node markers, in pixels (0 hides them). @defaultValue 4 */
  nodeRadius?: number;
  /** Leaf label font size, in pixels. @defaultValue 11 */
  labelFontSize?: number;
  /**
   * Pixels per leaf. When set, the tree is laid out that tall instead of fitting `height`, and the
   * view scrolls through it. Ignored for `"radial"`.
   */
  leafSpacing?: number;
  /** Per-node colour and bold, keyed by node `id` (see {@link TreeNodeInfo.descendantIds} for clades). */
  nodeStyles?: Record<string, TreeNodeStyle>;
  /** Per-branch colour, keyed by the `id` of the node below the branch. */
  branchStyles?: Record<string, TreeBranchStyle>;
  /** Node drawn highlighted, e.g. the one whose context menu is open. */
  activeNodeId?: string | null;
  /**
   * Called when a node marker is clicked (not dragged). When set, clicking an internal node calls
   * this instead of toggling its collapse, so the caller can offer a menu.
   */
  onNodeClick?: (node: TreeNodeInfo, event: React.MouseEvent) => void;
  /** Called when a branch is clicked, with the node below it; makes branches clickable. */
  onBranchClick?: (node: TreeNodeInfo, event: React.MouseEvent) => void;
  /** Let nodes be dragged among their siblings (writes `selection.order`). @defaultValue `interactive` */
  dragEnabled?: boolean;
  /** Called with the leaf names in display order whenever it changes, e.g. to order alignment rows. */
  onLeafOrderChange?: (leafNames: string[]) => void;
  /** Ref to the rendered `<svg>`, e.g. to export it. */
  svgRef?: React.Ref<SVGSVGElement>;
  /** The visible window, in pixels of the laid-out tree. @defaultValue the top of the tree, at full width */
  viewport?: Viewport;
  /** Called with the next window on every pan/zoom. */
  onViewportChange?: (next: Viewport) => void;
  /** Where the tree is rooted, which clades are collapsed, and sibling order. @defaultValue as passed, nothing collapsed */
  selection?: TreeSelection;
  /** Called with the next selection on every collapse, reorder or drag-to-reroot. */
  onSelectionChange?: (next: TreeSelection) => void;
}

/**
 * @public
 * @group Component props
 */
export interface PhyloTreeProps extends SimplePhyloTreeProps {
  /** Seeds the visible window when uncontrolled. */
  defaultViewport?: Viewport;
  /** Keeps the visible window in an external store. */
  viewportStore?: StoreController<Viewport>;
  /** Seeds the selection when uncontrolled. */
  defaultSelection?: TreeSelection;
  /** Keeps the selection in an external store. */
  selectionStore?: StoreController<TreeSelection>;
  /** @deprecated Use `layout="cladogram"`. */
  cladogram?: boolean;
}
