import type { HierarchyPointNode, Tree } from "../types";

/** Moves `draggedId` to `targetIndex` within `order`, keeping every other id's relative order. */
export function computeReordered(order: string[], draggedId: string, targetIndex: number): string[] {
  const without = order.filter((id) => id !== draggedId);
  const clampedIndex = Math.max(0, Math.min(without.length, targetIndex));
  return [...without.slice(0, clampedIndex), draggedId, ...without.slice(clampedIndex)];
}

/**
 * Returns a new tree with each node's children reordered per `order` (a node id → desired child
 * id sequence map, e.g. from dragging a leaf among its siblings). Ids in a node's own children
 * but missing from its `order` entry keep their original relative order, appended after the ones
 * that were explicitly ordered — so a stale/partial `order` map degrades gracefully instead of
 * dropping nodes.
 */
export function applyOrder(root: HierarchyPointNode<Tree>, order: Record<string, string[]>): HierarchyPointNode<Tree> {
  if (Object.keys(order).length === 0) return root;

  // Every node is copied with its `parent` pointing at the *copy* above it: layout writes positions
  // onto the new nodes, and a branch is drawn from `node.parent` — a stale pointer to the original
  // parent would draw it from wherever that (un-laid-out) object happens to sit.
  function reorderNode(node: HierarchyPointNode<Tree>, parent: HierarchyPointNode<Tree> | null): HierarchyPointNode<Tree> {
    const copy: HierarchyPointNode<Tree> = { ...node, parent };
    if (!node.children) return copy;
    const desired = order[node.id];
    let children = node.children;
    if (desired) {
      const byId = new Map(children.map((c) => [c.id, c]));
      const ordered = desired.map((id) => byId.get(id)).filter((c): c is HierarchyPointNode<Tree> => Boolean(c));
      const mentioned = new Set(desired);
      const remaining = children.filter((c) => !mentioned.has(c.id));
      children = [...ordered, ...remaining];
    }
    copy.children = children.map((child) => reorderNode(child, copy));
    copy.data = { ...node.data, children: copy.children.map((child) => child.data) };
    return copy;
  }

  return reorderNode(root, root.parent);
}
