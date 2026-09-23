import { assignSpread, maxCumulativeLength } from "../utils/hierarchy";
import type { HierarchyPointNode, LayoutResult, Tree } from "../types";

/**
 * Phylogram layout: same spread-axis (x) positioning as {@link computeCladogramLayout},
 * but the depth axis (y) is the node's cumulative branch length from the root, scaled so the
 * deepest leaf reaches `sizeY` — i.e. branch lengths are visually meaningful, and an unbalanced
 * tree's tips land at different depths.
 *
 * Reports pixels-per-branch-length-unit, so the scale bar can label a real distance.
 */
export function computeRectangularLayout(
  root: HierarchyPointNode<Tree>,
  sizeX: number,
  sizeY: number
): LayoutResult {
  assignSpread(root, sizeX);

  const maxLength = maxCumulativeLength(root, 0) || 1;
  const scalingFactor = sizeY / maxLength;

  function assignY(node: HierarchyPointNode<Tree>, currentLength: number): void {
    node.y = (currentLength + node.data.length) * scalingFactor;
    node.children?.forEach((child) => assignY(child, currentLength + node.data.length));
  }
  assignY(root, 0);

  return { scalingFactor };
}
