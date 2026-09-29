import { assignSpread } from "../utils/hierarchy";
import type { HierarchyPointNode, LayoutResult, Tree } from "../types";

/**
 * Cladogram layout: the rectangular spread axis, with depth by subtree height instead of branch
 * length, so every tip lines up flush. Reports no `scalingFactor`: there is no distance to label.
 */
export function computeCladogramLayout(
  root: HierarchyPointNode<Tree>,
  sizeX: number,
  sizeY: number
): LayoutResult {
  assignSpread(root, sizeX);

  function assignHeight(node: HierarchyPointNode<Tree>): number {
    if (!node.children || node.children.length === 0) {
      node.y = 0;
      return 0;
    }
    const height = 1 + Math.max(...node.children.map(assignHeight));
    node.y = height;
    return height;
  }
  const maxHeight = assignHeight(root);

  function normalizeDepth(node: HierarchyPointNode<Tree>): void {
    node.y = maxHeight > 0 ? ((maxHeight - node.y) / maxHeight) * sizeY : 0;
    node.children?.forEach(normalizeDepth);
  }
  normalizeDepth(root);

  return {};
}
