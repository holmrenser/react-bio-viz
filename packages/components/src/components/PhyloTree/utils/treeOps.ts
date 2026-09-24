import type { HierarchyPointNode, Tree, TreeNodeInfo, TreeSelection } from "../types";
import { buildHierarchy, countLeaves, descendants } from "./hierarchy";
import { applyOrder } from "./reorder";
import { rerootOnBranch } from "./reroot";

type Node = HierarchyPointNode<Tree>;

/**
 * The tree as {@link PhyloTree} displays it for `selection` — rerooted, then with sibling order
 * applied — but with collapsed clades still expanded (collapse only hides, it isn't a topology
 * change). Ids are those of the original tree (plus `REROOT_ID` for an inserted root).
 */
export function displayedHierarchy(tree: Tree, selection: Pick<TreeSelection, "rerootedAt" | "rerootPosition" | "order"> = {}): Node {
  let root = buildHierarchy(tree);
  if (selection.rerootedAt) root = rerootOnBranch(root, selection.rerootedAt, selection.rerootPosition);
  if (selection.order && Object.keys(selection.order).length > 0) root = applyOrder(root, selection.order);
  return root;
}

function toTree(node: Node): Tree {
  return { ...node.data, children: (node.children ?? []).map(toTree) };
}

/**
 * @public
 * The tree as displayed for `selection` (rerooted and reordered), as plain data — e.g. to export
 * it with {@link toNewick} exactly as the user arranged it.
 */
export function applyTreeSelection(tree: Tree, selection: Partial<TreeSelection> = {}): Tree {
  return toTree(displayedHierarchy(tree, selection));
}

/** @public Leaf names in display order for `selection` (leaves inside collapsed clades included). */
export function leafOrder(tree: Tree, selection: Partial<TreeSelection> = {}): string[] {
  return descendants(displayedHierarchy(tree, selection))
    .filter((node) => !node.children)
    .map((node) => node.data.name);
}

/**
 * @public
 * A `selection.order` that sorts every internal node's children by clade size — `"asc"` puts the
 * smaller clade first (on top), `"desc"` the larger — giving the tree a "ladder" shape.
 */
export function ladderizeOrder(tree: Tree, selection: Partial<TreeSelection>, direction: "asc" | "desc"): Record<string, string[]> {
  const sign = direction === "asc" ? 1 : -1;
  const order: Record<string, string[]> = {};
  for (const node of descendants(displayedHierarchy(tree, selection))) {
    if (!node.children || node.children.length < 2) continue;
    order[node.id] = [...node.children]
      .map((child, index) => ({ child, index, size: countLeaves(child) }))
      .sort((a, b) => sign * (a.size - b.size) || a.index - b.index)
      .map(({ child }) => child.id);
  }
  return order;
}

/** @public A `selection.order` with the children of `nodeId` reversed (a "rotate" of that node). */
export function rotateOrder(tree: Tree, selection: Partial<TreeSelection>, nodeId: string): Record<string, string[]> {
  const node = descendants(displayedHierarchy(tree, selection)).find((candidate) => candidate.id === nodeId);
  if (!node?.children) return { ...selection.order };
  return { ...selection.order, [nodeId]: node.children.map((child) => child.id).reverse() };
}

/**
 * @public
 * A `selection.order` that makes the tree's leaves follow `leafNames` as closely as its topology
 * allows: every node's children are sorted by the earliest position any of their leaves has in
 * `leafNames` (leaves not listed sort last, keeping their relative order). Used to make a tree
 * follow rows the user reordered in an alignment.
 */
export function orderForLeafNames(tree: Tree, selection: Partial<TreeSelection>, leafNames: readonly string[]): Record<string, string[]> {
  const rank = new Map<string, number>();
  leafNames.forEach((name, index) => {
    if (!rank.has(name)) rank.set(name, index);
  });
  const minRank = new Map<Node, number>();
  function compute(node: Node): number {
    const value = node.children
      ? Math.min(...node.children.map(compute))
      : (rank.get(node.data.name) ?? Number.POSITIVE_INFINITY);
    minRank.set(node, value);
    return value;
  }
  const root = displayedHierarchy(tree, selection);
  compute(root);
  const order: Record<string, string[]> = { ...selection.order };
  for (const node of descendants(root)) {
    if (!node.children || node.children.length < 2) continue;
    order[node.id] = node.children
      .map((child, index) => ({ child, index }))
      .sort((a, b) => minRank.get(a.child)! - minRank.get(b.child)! || a.index - b.index)
      .map(({ child }) => child.id);
  }
  return order;
}

/**
 * @public
 * A new tree in which every internal node whose support value (its numeric `name`) is below
 * `threshold` is dissolved into its parent — a polytomy — with its branch length added to each of
 * its children's. The root, leaves, and nodes without a numeric name are kept. Returns `tree`
 * itself when nothing is below the threshold.
 */
export function collapseBySupport(tree: Tree, threshold: number): Tree {
  let changed = false;
  function collapse(node: Tree, isRoot: boolean): Tree[] {
    const children = node.children.flatMap((child) => collapse(child, false));
    const support = Number.parseFloat(node.name);
    if (!isRoot && node.children.length > 0 && Number.isFinite(support) && support < threshold) {
      changed = true;
      return children.map((child) => ({ ...child, length: child.length + node.length }));
    }
    const same = children.length === node.children.length && children.every((child, index) => child === node.children[index]);
    return [same ? node : { ...node, children }];
  }
  const [result] = collapse(tree, true);
  return changed ? result : tree;
}

/** Describes `node` for a click callback. */
export function nodeInfo(node: Node, collapsed: ReadonlySet<string>, event: { clientX: number; clientY: number }): TreeNodeInfo {
  const all = descendants(node);
  const support = Number.parseFloat(node.data.name);
  return {
    id: node.id,
    name: node.data.name,
    isLeaf: !node.children && !collapsed.has(node.id),
    isRoot: node.parent === null,
    isCollapsed: collapsed.has(node.id),
    length: node.data.length,
    support: node.children && Number.isFinite(support) ? support : undefined,
    leafNames: all.filter((n) => !n.children).map((n) => n.data.name),
    descendantIds: all.map((n) => n.id),
    clientX: event.clientX,
    clientY: event.clientY,
  };
}
