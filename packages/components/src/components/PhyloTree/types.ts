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
 * aligns every tip flush at the right edge, regardless of topology imbalance; `radial` is a typed
 * placeholder for a future circular layout — selecting it currently falls back to `rectangular`
 * with a console warning.
 */
export type LayoutMode = "rectangular" | "cladogram" | "radial";

/**
 * @public
 * Which node the tree is rerooted at, and which internal nodes have their subtrees collapsed.
 * Controllable like every other stateful prop in this library — see `selection`/
 * `defaultSelection`/`onSelectionChange`/`selectionStore`.
 */
export interface TreeSelection {
  /** `id` (see {@link HierarchyPointNode}) of the node to treat as the root, or undefined for the original root. */
  rerootedAt?: string;
  /** `id`s of internal nodes whose subtrees are hidden. */
  collapsed: string[];
  /** Maps a node's `id` to a reordered sequence of its children's `id`s, overriding the source data's sibling order (set by dragging a leaf up/down). */
  order?: Record<string, string[]>;
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
  showSupportValues?: boolean;
  shadeBranchBySupport?: boolean;
  colorFunction?: ColorFn;
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
   * Render a clickable marker on internal nodes that toggles `selection.collapsed`, and let leaves
   * be dragged vertically to reorder them among their siblings (writes to `selection.order`).
   * @defaultValue false
   */
  interactive?: boolean;
  /** Bold leaves whose name matches this text (case-insensitive substring) or, with `searchUseRegex`, this regular expression; dims non-matches. An invalid regex matches nothing rather than throwing. */
  searchQuery?: string;
  /** Treat `searchQuery` as a regular expression instead of a plain substring. @defaultValue false */
  searchUseRegex?: boolean;
  /** Show a branch-length scale bar below the tree (only meaningful in `"rectangular"` layout). @defaultValue true */
  showScaleBar?: boolean;
}
