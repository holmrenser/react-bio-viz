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

  function reorderNode(node: HierarchyPointNode<Tree>): HierarchyPointNode<Tree> {
    if (!node.children) return node;
    const desired = order[node.id];
    let children = node.children;
    if (desired) {
      const byId = new Map(children.map((c) => [c.id, c]));
      const ordered = desired.map((id) => byId.get(id)).filter((c): c is HierarchyPointNode<Tree> => Boolean(c));
      const mentioned = new Set(desired);
      const remaining = children.filter((c) => !mentioned.has(c.id));
      children = [...ordered, ...remaining];
    }
    return { ...node, children: children.map(reorderNode) };
  }

  return reorderNode(root);
}
