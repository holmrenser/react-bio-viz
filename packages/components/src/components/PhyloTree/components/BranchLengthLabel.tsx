import { toCartesian } from "../utils/geometry";
import type { HierarchyPointNode, Tree } from "../types";

/** Rounds a branch length for display without trailing noise (0.1 + 0.2 → "0.3"). */
export function formatBranchLength(length: number): string {
  return String(Number(length.toPrecision(3)));
}

/** A branch's length, written just above the middle of its own segment. */
export function BranchLengthLabel({
  node,
  fontSize,
  center,
}: {
  node: HierarchyPointNode<Tree>;
  fontSize: number;
  center?: { cx: number; cy: number };
}) {
  const parent = node.parent!;
  const text = formatBranchLength(node.data.length);
  if (center) {
    const angle = node.angle ?? 0;
    const mid = toCartesian(((parent.radius ?? 0) + (node.radius ?? 0)) / 2, angle, center.cx, center.cy);
    return (
      <text x={mid.x} y={mid.y} fontSize={fontSize} textAnchor="middle" fill="currentColor" opacity={0.6} pointerEvents="none">
        {text}
      </text>
    );
  }
  return (
    <text
      x={(parent.y + node.y) / 2}
      y={node.x - 3}
      fontSize={fontSize}
      textAnchor="middle"
      fill="currentColor"
      opacity={0.6}
      pointerEvents="none"
    >
      {text}
    </text>
  );
}
