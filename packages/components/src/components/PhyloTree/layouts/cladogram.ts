import { assignSpread } from "../utils/hierarchy";
import type { HierarchyPointNode, LayoutResult, Tree } from "../types";

/**
 * Dendrogram/cluster layout: leaves are spread evenly along the x (spread) axis in traversal
 * order, internal nodes centered on their children (shared with {@link computeRectangularLayout});
 * leaves are aligned flush along the y (depth) axis based on subtree height (ignoring branch
 * length), so an unbalanced tree still produces tidy, tip-aligned branches — the same convention
 * as d3-hierarchy's `cluster()`, which this replaces.
 *
 * Reports no `scalingFactor`: with branch lengths ignored there is no distance-per-pixel to label.
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
