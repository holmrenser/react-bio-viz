import { ACCENT_COLOR } from "@react-bio-viz/core";
import { css } from "@emotion/css";

import type { HierarchyPointNode, Tree } from "../types";

const COLLAPSE_MARKER_CSS = css({
  cursor: "pointer",
  stroke: "currentColor",
  strokeWidth: 1,
  "&:hover": { stroke: ACCENT_COLOR },
});

/**
 * A clickable marker toggling an internal node's collapsed state. Rendered in a separate pass,
 * after every branch, so it's never occluded by a child branch painted on top of it — every
 * child's branch starts exactly at its parent's (x,y), and branches paint later (in document
 * order) than their parent's own content, so a marker drawn inline with `InternalNode` would sit
 * underneath its children's branches and silently swallow no clicks at all.
 *
 * Filled with the current text colour when collapsed and the page background when expanded, so it
 * reads the same way in either theme.
 */
export function CollapseMarker({
  node,
  isCollapsed,
  onToggle,
}: {
  node: HierarchyPointNode<Tree>;
  isCollapsed: boolean;
  onToggle: (id: string) => void;
}) {
  const { x, y } = node;
  return (
    <circle
      cx={y}
      cy={x}
      r="4"
      className={COLLAPSE_MARKER_CSS}
      fill={isCollapsed ? "currentColor" : "var(--background)"}
      onClick={() => onToggle(node.id)}
      data-pan-ignore
      data-node-id={node.id}
    >
      <title>{isCollapsed ? "Expand" : "Collapse"}</title>
    </circle>
  );
}
