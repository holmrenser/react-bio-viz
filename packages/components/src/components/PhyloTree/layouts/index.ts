import type { HierarchyPointNode, LayoutMode, LayoutResult, Tree } from "../types";
import { computeCladogramLayout } from "./cladogram";
import { computeRadialLayout } from "./radial";
import { computeRectangularLayout } from "./rectangular";

export { computeCladogramLayout } from "./cladogram";
export { computeRadialLayout } from "./radial";
export { computeRectangularLayout } from "./rectangular";

/**
 * Dispatches to the layout function for the given {@link LayoutMode}, mutating `x`/`y` (and, for
 * `"radial"`, `radius`/`angle`) on every node, and returning whatever geometry the chrome around
 * the tree needs — see {@link LayoutResult}.
 */
export function computeLayout(
  mode: LayoutMode,
  root: HierarchyPointNode<Tree>,
  sizeX: number,
  sizeY: number
): LayoutResult {
  switch (mode) {
    case "cladogram":
      return computeCladogramLayout(root, sizeX, sizeY);
    case "radial":
      return computeRadialLayout(root, sizeX, sizeY);
    case "rectangular":
    default:
      return computeRectangularLayout(root, sizeX, sizeY);
  }
}
