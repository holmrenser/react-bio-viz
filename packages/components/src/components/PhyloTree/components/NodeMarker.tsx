import { ACCENT_COLOR } from "@react-bio-viz/core";

import type { HierarchyPointNode, Tree } from "../types";

/**
 * Callbacks shared by every marker, keyed by node id so they stay referentially stable. A press may
 * become a drag (followed on the window by the owner) or a click.
 */
export interface NodeMarkerHandlers {
  onPointerDown: (nodeId: string, event: React.PointerEvent<SVGCircleElement>) => void;
  onClick: (nodeId: string, event: React.MouseEvent<SVGCircleElement>) => void;
}

/**
 * The clickable, draggable dot on a node. Drawn in a pass after every branch: each child's branch
 * starts at its parent's position, so a marker drawn with its node would sit under them.
 */
export function NodeMarker({
  node,
  radius,
  fill,
  isActive,
  isInteractive,
  isDraggable,
  title,
  handlers,
}: {
  node: HierarchyPointNode<Tree>;
  radius: number;
  fill: string;
  isActive: boolean;
  isInteractive: boolean;
  isDraggable: boolean;
  title?: string;
  handlers?: NodeMarkerHandlers;
}) {
  if (radius <= 0) return null;
  return (
    <circle
      cx={node.y}
      cy={node.x}
      r={isActive ? radius + 1.5 : radius}
      fill={fill}
      stroke={isActive ? ACCENT_COLOR : "currentColor"}
      strokeWidth={isActive ? 2 : 1}
      className={isInteractive ? "hover:stroke-2 hover:stroke-(--rbv-accent)" : undefined}
      style={{ cursor: isDraggable ? "grab" : isInteractive ? "pointer" : undefined }}
      data-pan-ignore={isInteractive || isDraggable ? true : undefined}
      data-node-id={node.id}
      onPointerDown={handlers ? (event) => handlers.onPointerDown(node.id, event) : undefined}
      onClick={handlers ? (event) => handlers.onClick(node.id, event) : undefined}
    >
      {title && <title>{title}</title>}
    </circle>
  );
}
