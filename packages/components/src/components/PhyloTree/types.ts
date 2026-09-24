import type { StoreController, Viewport } from "@react-bio-viz/core";

/** @public */
export type Tree = {
  ID?: string | number;
  name: string;
  color_regex?: string;
  length: number;
  children: Tree[];
};

/**
 * @public
 * A node in the laid-out tree: wraps the source `Tree` data with parent/children links, a stable
 * `id` for addressing it from {@link TreeSelection}, and the `x`/`y` pixel position a layout
 * produces. Named to match d3-hierarchy's `HierarchyPointNode` (which this used to be, directly)
 * so the public `LeafFn`/`ColorFn` API shape stays the same even though layout is computed
 * locally instead of via d3 — see the `bio-viz-conventions` project skill.
 */
export type HierarchyPointNode<T> = {
  /** `data.ID` when present, else a positional path (stable across renders, not across re-sorts). */
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

/**
 * What a layout function reports back about the geometry it produced, for the chrome that has to
 * be drawn around it (the scale bar, radial leaf labels). Every field is optional because it only
 * applies to the layouts that have a meaningful value for it.
 */
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

/** @public */
export type LeafFn = (arg0: {
  node: HierarchyPointNode<Tree>;
  fontSize?: number;
}) => JSX.Element;

/** @public */
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
 * Where the tree is rooted, which clades are collapsed, and how siblings are ordered. Controllable
 * like every other stateful prop in this library — see `selection`/`defaultSelection`/
 * `onSelectionChange`/`selectionStore`. All ids are those of the tree as passed in (see
 * {@link HierarchyPointNode}), and stay valid across reroots.
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

/** @public */
export interface PhyloTreeProps {
  /** Recursively defined tree object: `children` of a Tree are also a Tree. */
  tree: Tree;
  /** Maximum height in pixels. @defaultValue 900 */
  height?: number;
  /** Maximum width in pixels. @defaultValue 1000 */
  width?: number;
  /** @deprecated Use `layout="cladogram"` instead. */
  cladogram?: boolean;
  /** Tree layout mode — see {@link LayoutMode}. @defaultValue "rectangular" */
  layout?: LayoutMode;
  /** Label internal nodes with their name (typically bootstrap support). @defaultValue true */
  showSupportValues?: boolean;
  /** Only label support values at or above this value. @defaultValue 0 */
  supportThreshold?: number;
  /** Fade branches whose parent's support (a 0–1 value) is low. @defaultValue true */
  shadeBranchBySupport?: boolean;
  /** Seeds the default colour of each leaf's marker; `nodeStyles` overrides it. */
  colorFunction?: ColorFn;
  /** Font size of support-value labels, in pixels. @defaultValue 10 */
  fontSize?: number;
  /** Align leaf labels to a common tip column (using the layout's own tip-alignment position) rather than immediately after each branch. @defaultValue true */
  alignTips?: boolean;
  leafTextComponent?: LeafFn;
  /** The visible pan/zoom window over the rendered tree, fully controlled. */
  viewport?: Viewport;
  /** Seeds the visible window when uncontrolled. Defaults to fitting the whole tree. */
  defaultViewport?: Viewport;
  /** Called on every pan/zoom, whether user- or programmatically-driven. */
  onViewportChange?: (next: Viewport) => void;
  /** Delegates viewport state to an external store instead of local state. */
  viewportStore?: StoreController<Viewport>;
  /** The reroot/collapse selection, fully controlled. */
  selection?: TreeSelection;
  /** Seeds the selection when uncontrolled. Defaults to no reroot, nothing collapsed. */
  defaultSelection?: TreeSelection;
  /** Called on every reroot/collapse change. */
  onSelectionChange?: (next: TreeSelection) => void;
  /** Delegates selection state to an external store instead of local state. */
  selectionStore?: StoreController<TreeSelection>;
  /**
   * Render a clickable marker on internal nodes that toggles `selection.collapsed` (or calls
   * `onNodeClick`), and let nodes be dragged vertically among their siblings (writes to
   * `selection.order`; see `dragEnabled`).
   * @defaultValue false
   */
  interactive?: boolean;
  /** Bold leaves whose name matches this text (case-insensitive substring) or, with `searchUseRegex`, this regular expression; dims non-matches. An invalid regex matches nothing rather than throwing. */
  searchQuery?: string;
  /** Treat `searchQuery` as a regular expression instead of a plain substring. @defaultValue false */
  searchUseRegex?: boolean;
  /** Show a branch-length scale bar below the tree (only meaningful in `"rectangular"` layout). @defaultValue true */
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
   * Vertical pixels per leaf. When set, the tree is laid out that tall (instead of fitting
   * `height`) and the view scrolls through it — a large tree stays readable. Ignored for `"radial"`.
   */
  leafSpacing?: number;
  /** Per-node colour/bold, keyed by node `id` (see {@link TreeNodeInfo.descendantIds} for clades). */
  nodeStyles?: Record<string, TreeNodeStyle>;
  /** Per-branch colour, keyed by the `id` of the node below the branch. */
  branchStyles?: Record<string, TreeBranchStyle>;
  /** Node drawn highlighted — e.g. the one whose context panel is open. */
  activeNodeId?: string | null;
  /**
   * Called when a node marker is clicked (without dragging). When provided, clicking an internal
   * node's marker calls this instead of toggling collapse, so the caller can offer a menu.
   */
  onNodeClick?: (node: TreeNodeInfo, event: React.MouseEvent) => void;
  /** Called when a branch is clicked; makes branches clickable. Reports the node below the branch. */
  onBranchClick?: (node: TreeNodeInfo, event: React.MouseEvent) => void;
  /**
   * Let nodes be dragged vertically among their siblings (writes `selection.order`).
   * @defaultValue the value of `interactive`
   */
  dragEnabled?: boolean;
  /** Called with the leaf names in display order whenever it changes (e.g. to order alignment rows to match). */
  onLeafOrderChange?: (leafNames: string[]) => void;
  /** Ref to the rendered `<svg>`, e.g. to export it as SVG or PNG. */
  svgRef?: React.Ref<SVGSVGElement>;
}
