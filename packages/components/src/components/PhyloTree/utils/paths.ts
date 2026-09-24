import type { HierarchyPointNode, Tree, TreeSelection } from "../types";

type Node = HierarchyPointNode<Tree>;

/** The nodes on the path from `a` to `b` in a rooted hierarchy, both ends included. */
export function pathBetween(a: Node, b: Node): Node[] {
  const ancestorsOfA: Node[] = [];
  for (let node: Node | null = a; node; node = node.parent) ancestorsOfA.push(node);
  const indexInA = new Map(ancestorsOfA.map((node, index) => [node, index]));
  const fromB: Node[] = [];
  let node: Node | null = b;
  while (node && !indexInA.has(node)) {
    fromB.push(node);
    node = node.parent;
  }
  if (!node) return [];
  return [...ancestorsOfA.slice(0, indexInA.get(node)! + 1), ...fromB.reverse()];
}

/**
 * The point `distance` along `path` (a walk through the tree as passed in) expressed the way a
 * {@link TreeSelection} places a root: the node whose branch holds the point, and the fraction of
 * that branch from the node towards its parent.
 */
export function rootAtPathPoint(path: Node[], distance: number): Pick<TreeSelection, "rerootedAt" | "rerootPosition"> {
  let walked = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const u = path[i];
    const v = path[i + 1];
    const child = v.parent === u ? v : u;
    const length = child.data.length || 0;
    const isLast = i === path.length - 2;
    if (walked + length >= distance || isLast) {
      const fromU = Math.max(0, Math.min(length, distance - walked));
      const fromChild = child === u ? fromU : length - fromU;
      return { rerootedAt: child.id, rerootPosition: length > 0 ? fromChild / length : 0.5 };
    }
    walked += length;
  }
  return {};
}
