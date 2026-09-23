import { countLeaves, maxCumulativeLength } from "../utils/hierarchy";
import { toCartesian } from "../utils/geometry";
import type { HierarchyPointNode, LayoutResult, Tree } from "../types";

/**
 * Circular phylogram: leaves are spread evenly around a full turn, and a node's distance from the
 * centre is its cumulative branch length scaled so the deepest tip reaches `maxRadius` — the polar
 * equivalent of {@link computeRectangularLayout}. Internal nodes sit at the
 * midpoint of their children's angles, so a branch fans out symmetrically over its subtree.
 *
 * Writes `radius`/`angle` for the renderer's arcs and rotated labels, and also writes the derived
 * cartesian position into `x`/`y` (in the same screen convention as every other layout: `y` is the
 * horizontal position, `x` the vertical) so node markers and hit-testing need no special case.
 */
export function computeRadialLayout(
  root: HierarchyPointNode<Tree>,
  sizeX: number,
  sizeY: number
): LayoutResult {
  // `sizeX` spans the vertical (spread) axis and `sizeY` the horizontal (depth) axis, so the
  // circle is centred in that box and sized by whichever dimension is tighter.
  const cx = sizeY / 2;
  const cy = sizeX / 2;
  const maxRadius = Math.max(0, Math.min(sizeX, sizeY) / 2);

  const maxLength = maxCumulativeLength(root, 0) || 1;
  const scalingFactor = maxRadius / maxLength;

  const leafCount = countLeaves(root);
  const angleStep = leafCount > 0 ? (2 * Math.PI) / leafCount : 0;
  let leafIndex = 0;

  function assign(node: HierarchyPointNode<Tree>, currentLength: number): void {
    const cumulative = currentLength + (node.data.length || 0);
    node.radius = cumulative * scalingFactor;

    if (!node.children || node.children.length === 0) {
      node.angle = leafIndex * angleStep;
      leafIndex += 1;
    } else {
      node.children.forEach((child) => assign(child, cumulative));
      const first = node.children[0].angle ?? 0;
      const last = node.children[node.children.length - 1].angle ?? 0;
      node.angle = (first + last) / 2;
    }

    const point = toCartesian(node.radius, node.angle, cx, cy);
    node.y = point.x;
    node.x = point.y;
  }
  assign(root, 0);

  return { scalingFactor, center: { cx, cy }, maxRadius };
}
