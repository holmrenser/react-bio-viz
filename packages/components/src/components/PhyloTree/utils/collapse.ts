import type { HierarchyPointNode, Tree } from "../types";
import { countLeaves } from "./hierarchy";

/**
 * A new tree with the subtrees of `collapsedIds` pruned, so each collapsed clade lays out as one
 * tip; `collapsedLeafCount` records how many leaves it hides.
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
