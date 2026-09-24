import type { HierarchyPointNode, Tree } from "../types";
import { countLeaves } from "./hierarchy";

/**
 * Returns a new tree where every node whose `id` is in `collapsedIds` has its subtree pruned, so
 * layout treats it as a leaf and a collapsed clade takes up the visual space of a single tip
 * instead of its full expansion, recording how many leaves it hides in `collapsedLeafCount`.
 * `x`/`y` are reset since layout runs fresh afterward.
 */
export function pruneCollapsed(root: HierarchyPointNode<Tree>, collapsedIds: string[]): HierarchyPointNode<Tree> {
  if (collapsedIds.length === 0) return root;
  const collapsedSet = new Set(collapsedIds);

  function prune(node: HierarchyPointNode<Tree>, parent: HierarchyPointNode<Tree> | null): HierarchyPointNode<Tree> {
    const copy: HierarchyPointNode<Tree> = { ...node, parent, x: 0, y: 0 };
    if (!collapsedSet.has(node.id) && node.children) {
      copy.children = node.children.map((child) => prune(child, copy));
    } else if (node.children) {
      copy.collapsedLeafCount = countLeaves(node);
      delete copy.children;
    }
    return copy;
  }

  return prune(root, null);
}
