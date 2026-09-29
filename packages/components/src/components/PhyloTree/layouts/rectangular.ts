import { assignSpread, maxCumulativeLength } from "../utils/hierarchy";
import type { HierarchyPointNode, LayoutResult, Tree } from "../types";

/**
 * Phylogram layout: leaves spread evenly along `x`, depth (`y`) by cumulative branch length scaled
 * so the deepest leaf reaches `sizeY`. Reports pixels per branch-length unit, for the scale bar.
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
