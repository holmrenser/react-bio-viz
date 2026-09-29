import type { HierarchyPointNode, Tree } from "../types";

/** Moves `draggedId` to `targetIndex` within `order`, keeping every other id's relative order. */
export function computeReordered(order: string[], draggedId: string, targetIndex: number): string[] {
  const without = order.filter((id) => id !== draggedId);
  const clampedIndex = Math.max(0, Math.min(without.length, targetIndex));
  return [...without.slice(0, clampedIndex), draggedId, ...without.slice(clampedIndex)];
}

/**
 * A new tree with each node's children in the order `order` gives (node id → child ids). Children
 * it doesn't list follow, in their original order, so a partial or stale `order` never drops nodes.
 */
export function applyOrder(root: HierarchyPointNode<Tree>, order: Record<string, string[]>): HierarchyPointNode<Tree> {
  if (Object.keys(order).length === 0) return root;

  // Point each copy's `parent` at the copy above it: branches are drawn from `node.parent`, and a
  // stale pointer would draw them from the original, un-laid-out node.
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
