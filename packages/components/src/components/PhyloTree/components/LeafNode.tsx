import randomColor from "randomcolor";
import { css, cx } from "@emotion/css";

import { RADIAL_LABEL_GAP, RADIAL_LABEL_MAX_CHARS } from "../constants";
import { toCartesian, truncate } from "../utils/geometry";
import type { ColorFn, HierarchyPointNode, LeafFn, Tree } from "../types";

export function defaultLeafText({
  node,
  fontSize = 11,
}: {
  node: HierarchyPointNode<Tree>;
  fontSize?: number;
}): JSX.Element {
  const {
    data: { name },
  } = node;
  return (
    <text x={0} y={0} fill="currentColor" className={css({ fontFamily: "sans-serif", fontSize: `${fontSize}` })}>
      {name}
    </text>
  );
}

const DRAGGABLE_CSS = css({ cursor: "grab" });

const TIP_CONNECTOR_CSS = css({
  stroke: "currentColor",
  opacity: 0.4,
  strokeWidth: 1,
  strokeDasharray: "1,2",
});

/** Radial geometry for one leaf: where its label sits, and which way round it reads. */
export interface RadialLeafOptions {
  center: { cx: number; cy: number };
  maxRadius: number;
}

/**
 * A leaf/tip: a dashed connector from the branch tip to the label position, a colored node
 * marker, and the label itself. When `alignTips` is set, every leaf's label sits at the same
 * `tipColumnY` depth (flush-aligned) instead of immediately after its own (possibly much shorter
 * or longer) branch — matters in `"rectangular"` layout, where branch length varies per leaf.
 *
 * Under `radial`, labels instead sit just outside the outermost radius and are rotated onto their
 * own spoke, flipping on the left half of the circle so no label reads upside down.
 *
 * When `onReorderPointerDown` is supplied, the node marker becomes draggable (vertically, among
 * its siblings) — marked `data-pan-ignore` so the surface's own pan-drag doesn't capture the
 * pointer first, same convention as `CollapseMarker`.
 */
export function LeafNode({
  node,
  colorFunction,
  leafTextComponent,
  alignTips,
  tipColumnY,
  isSearchMatch,
  isSearchActive,
  radial,
  onReorderPointerDown,
  onReorderPointerMove,
  onReorderPointerUp,
}: {
  node: HierarchyPointNode<Tree>;
  colorFunction?: ColorFn;
  leafTextComponent?: LeafFn;
  alignTips?: boolean;
  tipColumnY: number;
  /** Whether this leaf matches the active search query (ignored when `isSearchActive` is false). */
  isSearchMatch?: boolean;
  /** Whether a search query is currently active at all — controls whether non-matches dim. */
  isSearchActive?: boolean;
  /** Supplied only by the radial layout; its presence selects the radial label geometry. */
  radial?: RadialLeafOptions;
  onReorderPointerDown?: (node: HierarchyPointNode<Tree>, event: React.PointerEvent<SVGCircleElement>) => void;
  onReorderPointerMove?: (event: React.PointerEvent<SVGCircleElement>) => void;
  onReorderPointerUp?: (event: React.PointerEvent<SVGCircleElement>) => void;
}) {
  const {
    data: { name },
    x,
    y,
  } = node;
  const colorSeed = typeof colorFunction !== "undefined" ? colorFunction(node) : name;
  const LeafTextComponent = typeof leafTextComponent === "undefined" ? defaultLeafText : leafTextComponent;
  const labelStyle = isSearchActive
    ? { fontWeight: isSearchMatch ? "bold" : "normal", opacity: isSearchMatch ? 1 : 0.3 }
    : undefined;

  const marker = (
    <circle
      className={cx(css({ fill: randomColor({ seed: colorSeed }) }), onReorderPointerDown && DRAGGABLE_CSS)}
      r="4.5"
      data-pan-ignore={onReorderPointerDown ? true : undefined}
      onPointerDown={onReorderPointerDown ? (event) => onReorderPointerDown(node, event) : undefined}
      onPointerMove={onReorderPointerMove}
      onPointerUp={onReorderPointerUp}
      onPointerCancel={onReorderPointerUp}
    />
  );

  if (radial) {
    const angle = node.angle ?? 0;
    const labelPoint = toCartesian(radial.maxRadius + RADIAL_LABEL_GAP, angle, radial.center.cx, radial.center.cy);
    // Past a quarter turn the text would read upside down, so flip it and anchor from the far end.
    const isFlipped = angle > Math.PI / 2 && angle < (3 * Math.PI) / 2;
    const degrees = (angle * 180) / Math.PI + (isFlipped ? 180 : 0);

    return (
      <g className="tipnode">
        <title>{name}</title>
        <line x1={y} y1={x} x2={labelPoint.x} y2={labelPoint.y} className={TIP_CONNECTOR_CSS} />
        <g transform={`translate(${y},${x})`}>{marker}</g>
        <g
          transform={`translate(${labelPoint.x},${labelPoint.y}) rotate(${degrees})`}
          style={labelStyle}
          textAnchor={isFlipped ? "end" : "start"}
          dominantBaseline="central"
        >
          <LeafTextComponent node={{ ...node, data: { ...node.data, name: truncate(name, RADIAL_LABEL_MAX_CHARS) } }} />
        </g>
      </g>
    );
  }

  const textY = (alignTips ? tipColumnY : y) + 10;
  const nodeY = y + 4;

  return (
    <g className="tipnode">
      <title>{name}</title>
      <line x1={nodeY} x2={textY} y1={x} y2={x} className={TIP_CONNECTOR_CSS} />
      <g transform={`translate(${nodeY},${x})`}>{marker}</g>
      <g transform={`translate(${textY},${x + 4})`} style={labelStyle}>
        <LeafTextComponent node={node} />
      </g>
    </g>
  );
}
