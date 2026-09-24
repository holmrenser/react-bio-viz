import { css } from "@emotion/css";

import { BRANCH_HIT_WIDTH, DEFAULT_BRANCH_OPACITY } from "../constants";
import { arcPath, toCartesian } from "../utils/geometry";
import type { HierarchyPointNode, Tree } from "../types";

const HIT_CSS = css({ cursor: "pointer", "&:hover + path": { stroke: "var(--rbv-accent)" } });

/** The elbow a rectangular/cladogram layout uses: out along the parent's depth, then across. */
function elbowPath(node: HierarchyPointNode<Tree>): string {
  const parent = node.parent!;
  return `M${parent.y},${parent.x} L${parent.y},${node.x} L${node.y},${node.x}`;
}

/**
 * The radial equivalent: a straight segment outward along this node's own angle, plus — drawn once
 * per parent, by its first child — the arc at the parent's radius that spans its children's
 * angles. Together these are the polar counterpart of the elbow's two legs.
 */
function radialPath(node: HierarchyPointNode<Tree>, center: { cx: number; cy: number }): string {
  const parent = node.parent!;
  const angle = node.angle ?? 0;
  const parentRadius = parent.radius ?? 0;
  const from = toCartesian(parentRadius, angle, center.cx, center.cy);
  const to = toCartesian(node.radius ?? 0, angle, center.cx, center.cy);
  let path = `M${from.x},${from.y} L${to.x},${to.y}`;

  const siblings = parent.children;
  if (siblings && siblings.length > 1 && siblings[0] === node) {
    const first = siblings[0].angle ?? 0;
    const last = siblings[siblings.length - 1].angle ?? 0;
    path += ` ${arcPath(center.cx, center.cy, parentRadius, first, last)}`;
  }
  return path;
}

/** Just this node's own segment (no sibling arc/connector) — the part a click on the branch means. */
function ownSegment(node: HierarchyPointNode<Tree>, center?: { cx: number; cy: number }): string {
  const parent = node.parent!;
  if (center) {
    const angle = node.angle ?? 0;
    const from = toCartesian(parent.radius ?? 0, angle, center.cx, center.cy);
    const to = toCartesian(node.radius ?? 0, angle, center.cx, center.cy);
    return `M${from.x},${from.y} L${to.x},${to.y}`;
  }
  return `M${parent.y},${node.x} L${node.y},${node.x}`;
}

/**
 * How strongly to draw a branch: its parent's support value when shading is on and that value is
 * actually numeric. Internal node names are free text in Newick — they hold a bootstrap value on
 * some trees and a clade name (or nothing) on others — so a non-numeric name falls back to the
 * default rather than producing `opacity="NaN"`.
 */
function branchOpacity(node: HierarchyPointNode<Tree>, shadeBranchBySupport?: boolean): number {
  if (!shadeBranchBySupport) return DEFAULT_BRANCH_OPACITY;
  // parseFloat, not Number: an unlabelled node (every Newick root, many internal nodes) has name
  // "", which Number() reads as 0 — a support of zero, i.e. an invisible branch.
  const support = Number.parseFloat(node.parent!.data.name);
  return Number.isFinite(support) ? Math.min(1, Math.max(0, support)) : DEFAULT_BRANCH_OPACITY;
}

/** The connector from a node's parent to the node itself, in whichever geometry the layout used. */
export function TreeBranch({
  node,
  shadeBranchBySupport,
  center,
  color,
  width,
  onClick,
}: {
  node: HierarchyPointNode<Tree>;
  shadeBranchBySupport?: boolean;
  /** Circle centre, supplied only by the radial layout; its presence selects the geometry. */
  center?: { cx: number; cy: number };
  color?: string;
  width: number;
  /** When set, the branch gets a wide invisible hit area and reports clicks with the node's id. */
  onClick?: (nodeId: string, event: React.MouseEvent) => void;
}) {
  return (
    <>
      {onClick && (
        <path
          d={ownSegment(node, center)}
          className={HIT_CSS}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(BRANCH_HIT_WIDTH, width + 4)}
          data-pan-ignore
          data-branch-id={node.id}
          onClick={(event) => {
            event.stopPropagation();
            onClick(node.id, event);
          }}
        />
      )}
      <path
        d={center ? radialPath(node, center) : elbowPath(node)}
        fill="none"
        stroke={color ?? "currentColor"}
        strokeWidth={width}
        opacity={branchOpacity(node, shadeBranchBySupport)}
        pointerEvents="none"
      />
    </>
  );
}
