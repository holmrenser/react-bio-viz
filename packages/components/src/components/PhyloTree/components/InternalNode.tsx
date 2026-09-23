import { css } from "@emotion/css";

import type { HierarchyPointNode, Tree } from "../types";

/** An internal node's support-value label. */
export function InternalNode({
  node,
  fontSize,
  showSupportValues,
}: {
  node: HierarchyPointNode<Tree>;
  fontSize: number;
  showSupportValues?: boolean;
}) {
  if (!showSupportValues) return null;
  const { data, x, y } = node;
  const { name } = data;
  return (
    <text
      x={y + 3}
      y={x + 2}
      dominantBaseline="middle"
      fill="currentColor"
      opacity={0.75}
      className={css({ fontSize, fontFamily: "sans-serif" })}
    >
      {name}
    </text>
  );
}
