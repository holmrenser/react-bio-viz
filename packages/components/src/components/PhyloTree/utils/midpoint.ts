import type { HierarchyPointNode, Tree, TreeSelection } from "../types";
import { buildHierarchy, descendants } from "./hierarchy";
import { rootAtPathPoint } from "./paths";

type Node = HierarchyPointNode<Tree>;

/**
 * @public
 * The `rerootedAt`/`rerootPosition` pair that roots `tree` at its midpoint: the point halfway
 * along the longest leaf-to-leaf path. Independent of the tree's current rooting, so it can be
 * spread straight into a selection. Returns `{}` (no reroot) for a tree with fewer than two leaves.
 *
 * @example
 * ```ts
 * setSelection((prev) => ({ ...prev, ...midpointRoot(tree) }));
 * ```
 */
export function midpointRoot(tree: Tree): Pick<TreeSelection, "rerootedAt" | "rerootPosition"> {
  const root = buildHierarchy(tree);
  const nodes = descendants(root);
  const leaves = nodes.filter((node) => !node.children);
  if (leaves.length < 2) return {};

  const neighbours = new Map<Node, { to: Node; length: number }[]>();
  for (const node of nodes) neighbours.set(node, []);
  for (const node of nodes) {
    if (!node.parent) continue;
    const length = node.data.length || 0;
    neighbours.get(node)!.push({ to: node.parent, length });
    neighbours.get(node.parent)!.push({ to: node, length });
  }

  /** Farthest leaf from `start`, with the path to it. */
  function farthest(start: Node): { leaf: Node; distance: number; path: Node[] } {
    let best = { leaf: start, distance: 0, path: [start] };
    const stack: { node: Node; from: Node | null; distance: number; path: Node[] }[] = [
      { node: start, from: null, distance: 0, path: [start] },
    ];
    while (stack.length > 0) {
      const { node, from, distance, path } = stack.pop()!;
      if (!node.children && distance > best.distance) best = { leaf: node, distance, path };
      for (const edge of neighbours.get(node)!) {
        if (edge.to !== from) stack.push({ node: edge.to, from: node, distance: distance + edge.length, path: [...path, edge.to] });
      }
    }
    return best;
  }

  const { leaf: a } = farthest(leaves[0]);
  const { distance: diameter, path } = farthest(a);
  if (diameter <= 0) return {};

  return rootAtPathPoint(path, diameter / 2);
}
