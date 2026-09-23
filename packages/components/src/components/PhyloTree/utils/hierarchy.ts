import type { HierarchyPointNode, Tree } from "../types";

/** Wraps a nested `Tree` into a linked `HierarchyPointNode` tree with parent pointers and stable ids. */
export function buildHierarchy(
  data: Tree,
  parent: HierarchyPointNode<Tree> | null = null,
  depth = 0,
  path = "0"
): HierarchyPointNode<Tree> {
  const id = data.ID !== undefined ? String(data.ID) : path;
  const node: HierarchyPointNode<Tree> = { id, data, parent, depth, x: 0, y: 0 };
  if (data.children && data.children.length > 0) {
    node.children = data.children.map((child, index) => buildHierarchy(child, node, depth + 1, `${path}.${index}`));
  }
  return node;
}

/** Flattens a `HierarchyPointNode` tree (root included) into an array, in pre-order. */
export function descendants<T>(node: HierarchyPointNode<T>): HierarchyPointNode<T>[] {
  const result: HierarchyPointNode<T>[] = [node];
  node.children?.forEach((child) => result.push(...descendants(child)));
  return result;
}

/** Depth-first search for the node with the given `id`, or `null` if not present. */
export function findById<T>(root: HierarchyPointNode<T>, id: string): HierarchyPointNode<T> | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

/** Deepest cumulative branch length from `node` down to any leaf below it. */
export function maxCumulativeLength(node: HierarchyPointNode<Tree>, current = 0): number {
  const total = current + (node.data.length || 0);
  if (!node.children || node.children.length === 0) return total;
  return Math.max(...node.children.map((child) => maxCumulativeLength(child, total)));
}

/** How many leaves sit below `node` (counting `node` itself when it has no children). */
export function countLeaves<T>(node: HierarchyPointNode<T>): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

/**
 * Assigns the spread-axis (`x`) position shared by every rectangular-shaped layout: leaves get
 * sequential positions in traversal order, internal nodes are centered on their children. Mutates
 * `x` on every node and normalizes it into `[0, sizeX]`.
 */
export function assignSpread<T>(root: HierarchyPointNode<T>, sizeX: number): void {
  let leafIndex = 0;

  function assign(node: HierarchyPointNode<T>): void {
    if (!node.children || node.children.length === 0) {
      node.x = leafIndex;
      leafIndex += 1;
      return;
    }
    node.children.forEach(assign);
    const sum = node.children.reduce((acc, child) => acc + child.x, 0);
    node.x = sum / node.children.length;
  }
  assign(root);

  const maxLeafIndex = Math.max(1, leafIndex - 1);
  function normalize(node: HierarchyPointNode<T>): void {
    node.x = (node.x / maxLeafIndex) * sizeX;
    node.children?.forEach(normalize);
  }
  normalize(root);
}
