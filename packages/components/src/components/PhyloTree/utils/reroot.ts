import { buildHierarchy, findById } from "./hierarchy";
import type { HierarchyPointNode, Tree } from "../types";

function toPlainTree(node: HierarchyPointNode<Tree>): Tree {
  return { ...node.data, children: (node.children ?? []).map(toPlainTree) };
}

/**
 * Returns a new tree rerooted at the node with the given `id` (the original tree, unchanged, if
 * `id` doesn't resolve to a node or resolves to the current root).
 *
 * Standard tree-rerooting: walking up from the target to the original root, each ancestor becomes
 * a child of the previous one, keeping its other children (siblings along the original path) and
 * taking on the branch length of the edge that was just inverted — so every original branch
 * length is preserved, just reattributed to the reversed direction of traversal.
 */
export function rerootTree(root: HierarchyPointNode<Tree>, targetId: string): HierarchyPointNode<Tree> {
  const target = findById(root, targetId);
  if (!target || !target.parent) return root;

  const newRoot: Tree = {
    ...target.data,
    length: 0,
    children: (target.children ?? []).map(toPlainTree),
  };

  let attachTo = newRoot;
  let childComingFrom = target;
  let oldParent: HierarchyPointNode<Tree> | null = target.parent;
  let edgeLength = target.data.length;

  while (oldParent) {
    const siblings = (oldParent.children ?? []).filter((c) => c !== childComingFrom).map(toPlainTree);
    const inverted: Tree = { ...oldParent.data, length: edgeLength, children: siblings };
    attachTo.children.push(inverted);
    attachTo = inverted;
    edgeLength = oldParent.data.length;
    childComingFrom = oldParent;
    oldParent = oldParent.parent;
  }

  return buildHierarchy(newRoot);
}
