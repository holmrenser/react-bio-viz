import type { HierarchyPointNode, Tree } from "../types";
import { findById } from "./hierarchy";

type Node = HierarchyPointNode<Tree>;

/** @public `id` of the root a reroot inserts (every other node keeps its original `id`). */
export const REROOT_ID = "__reroot__";

interface Edge {
  to: Node;
  length: number;
}

/**
 * A new tree rooted on the branch above `targetId`: a new root ({@link REROOT_ID}) splits it,
 * `position` of the way from the target (0) to its parent (1). The tree is re-hung as if unrooted,
 * so every edge keeps its length and every other node its `id`; a bifurcating old root dissolves
 * into one edge. Returns `root` itself when `targetId` is unknown or the root.
 */
export function rerootOnBranch(root: Node, targetId: string, position = 0.5): Node {
  const target = findById(root, targetId);
  if (!target || !target.parent) return root;
  const parent = target.parent;
  const fraction = Math.max(0, Math.min(1, Number.isFinite(position) ? position : 0.5));
  const branch = target.data.length || 0;

  // Undirected adjacency, minus the branch being split.
  const adjacency = new Map<Node, Edge[]>();
  const link = (a: Node, b: Node, length: number) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ to: b, length });
    adjacency.get(b)!.push({ to: a, length });
  };
  (function walk(node: Node) {
    adjacency.set(node, adjacency.get(node) ?? []);
    for (const child of node.children ?? []) {
      if (!(node === parent && child === target)) link(node, child, child.data.length || 0);
      walk(child);
    }
  })(root);

  function build(node: Node, from: Node | null, length: number, newParent: Node | null, depth: number): Node {
    const next = (adjacency.get(node) ?? []).filter((edge) => edge.to !== from);
    // A bifurcating old root ends up with one child once re-hung: dissolve it into one edge.
    if (node === root && next.length === 1) {
      return build(next[0].to, node, length + next[0].length, newParent, depth);
    }
    const copy: Node = { id: node.id, data: { ...node.data, length, children: [] }, parent: newParent, depth, x: 0, y: 0 };
    if (next.length > 0) {
      copy.children = next.map((edge) => build(edge.to, node, edge.length, copy, depth + 1));
      copy.data.children = copy.children.map((child) => child.data);
    }
    return copy;
  }

  const newRoot: Node = { id: REROOT_ID, data: { name: "", length: 0, children: [] }, parent: null, depth: 0, x: 0, y: 0 };
  newRoot.children = [
    build(target, parent, branch * fraction, newRoot, 1),
    build(parent, target, branch * (1 - fraction), newRoot, 1),
  ];
  newRoot.data.children = newRoot.children.map((child) => child.data);
  return newRoot;
}
