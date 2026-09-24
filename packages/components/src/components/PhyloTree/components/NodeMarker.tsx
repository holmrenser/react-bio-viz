import { ACCENT_COLOR } from "@react-bio-viz/core";
import { css } from "@emotion/css";

import type { HierarchyPointNode, Tree } from "../types";

const MARKER_CSS = css({ "&:hover": { stroke: ACCENT_COLOR, strokeWidth: 2 } });

/**
 * Callbacks shared by every marker, keyed by node id so they stay referentially stable. A press may
 * become a drag (followed on the window by the owner) or a click.
 */
export interface NodeMarkerHandlers {
  onPointerDown: (nodeId: string, event: React.PointerEvent<SVGCircleElement>) => void;
  onClick: (nodeId: string, event: React.MouseEvent<SVGCircleElement>) => void;
}

/**
 * The clickable/draggable dot on a node. Rendered in a separate pass, after every branch, so it's
 * never occluded by a child branch painted on top of it — every child's branch starts exactly at
 * its parent's (x,y), and branches paint later (in document order) than their parent's own
 * content, so a marker drawn inline with the node would sit underneath its children's branches and
 * silently swallow no clicks at all.
 *
 * Internal nodes are hollow (the page background) when expanded and filled when collapsed, so the
 * state reads the same way in either theme; leaves take their own colour.
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
      className={isInteractive ? MARKER_CSS : undefined}
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
