import { COLLAPSED_TRIANGLE } from "../constants";
import { toCartesian } from "../utils/geometry";
import type { HierarchyPointNode, Tree } from "../types";

/**
 * A collapsed clade: a triangle opening away from the node, sized by how many leaves it hides, and
 * a "<n> taxa" label where the clade's leaf labels would be.
 */
export function CollapsedClade({
  node,
  color,
  fontSize,
  labelX,
  radial,
}: {
  node: HierarchyPointNode<Tree>;
  color?: string;
  fontSize: number;
  /** Rectangular layouts: depth-axis position of the label (the tip column when tips are aligned). */
  labelX: number;
  radial?: { center: { cx: number; cy: number }; maxRadius: number };
}) {
  const count = node.collapsedLeafCount ?? 0;
  const spread = Math.min(COLLAPSED_TRIANGLE.maxSpread, COLLAPSED_TRIANGLE.minSpread + count * COLLAPSED_TRIANGLE.spreadPerLeaf);
  const fill = color ?? "currentColor";
  const label = `${count} taxa`;

  if (radial) {
    const angle = node.angle ?? 0;
    const radius = node.radius ?? 0;
    const halfAngle = Math.min(Math.PI / 12, spread / 2 / Math.max(1, radius + COLLAPSED_TRIANGLE.length));
    const a = toCartesian(radius + COLLAPSED_TRIANGLE.length, angle - halfAngle, radial.center.cx, radial.center.cy);
    const b = toCartesian(radius + COLLAPSED_TRIANGLE.length, angle + halfAngle, radial.center.cx, radial.center.cy);
    const labelPoint = toCartesian(radial.maxRadius + COLLAPSED_TRIANGLE.labelGap, angle, radial.center.cx, radial.center.cy);
    const isFlipped = angle > Math.PI / 2 && angle < (3 * Math.PI) / 2;
    const degrees = (angle * 180) / Math.PI + (isFlipped ? 180 : 0);
    return (
      <g className="collapsed-clade">
        <title>{`${node.data.name || "Clade"} — ${label}`}</title>
        <polygon points={`${node.y},${node.x} ${a.x},${a.y} ${b.x},${b.y}`} fill={fill} opacity={0.35} stroke={fill} />
        <text
          transform={`translate(${labelPoint.x},${labelPoint.y}) rotate(${degrees})`}
          textAnchor={isFlipped ? "end" : "start"}
          dominantBaseline="central"
          fontSize={fontSize}
          fill={color ?? "currentColor"}
          fontStyle="italic"
        >
          {label}
        </text>
      </g>
    );
  }

  const tipX = node.y + COLLAPSED_TRIANGLE.length;
  return (
    <g className="collapsed-clade">
      <title>{`${node.data.name || "Clade"} — ${label}`}</title>
      <polygon
        points={`${node.y},${node.x} ${tipX},${node.x - spread / 2} ${tipX},${node.x + spread / 2}`}
        fill={fill}
        opacity={0.35}
        stroke={fill}
      />
      <text
        x={Math.max(labelX, tipX + COLLAPSED_TRIANGLE.labelGap)}
        y={node.x}
        dominantBaseline="central"
        fontSize={fontSize}
        fill={color ?? "currentColor"}
        fontStyle="italic"
      >
        {label}
      </text>
    </g>
  );
}
