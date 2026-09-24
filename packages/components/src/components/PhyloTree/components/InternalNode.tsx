import { css } from "@emotion/css";

import type { HierarchyPointNode, Tree } from "../types";

/**
 * An internal node's label (typically bootstrap support). A numeric label below `threshold` is
 * hidden; non-numeric labels (clade names) show only when no threshold is set.
 */
export function InternalNode({
  node,
  fontSize,
  threshold = 0,
}: {
  node: HierarchyPointNode<Tree>;
  fontSize: number;
  threshold?: number;
}) {
  const { data, x, y } = node;
  const { name } = data;
  if (!name) return null;
  const value = Number.parseFloat(name);
  if (threshold > 0 && !(Number.isFinite(value) && value >= threshold)) return null;
  return (
    <text
      x={y + 3}
      y={x + 2}
      dominantBaseline="middle"
      fill="currentColor"
      opacity={0.75}
      pointerEvents="none"
      className={css({ fontSize, fontFamily: "sans-serif" })}
    >
      {name}
    </text>
  );
}
