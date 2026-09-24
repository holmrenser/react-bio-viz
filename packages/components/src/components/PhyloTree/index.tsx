import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import randomColor from "randomcolor";
import { ROOT_CLASS, useDragPan, useViewport, useWheelZoom, ViewportToolbar } from "@react-bio-viz/core";

import { BranchLengthLabel } from "./components/BranchLengthLabel";
import { CollapsedClade } from "./components/CollapsedClade";
import { InternalNode } from "./components/InternalNode";
import { defaultLeafText, LeafNode } from "./components/LeafNode";
import { NodeMarker, type NodeMarkerHandlers } from "./components/NodeMarker";
import { ScaleBar } from "./components/ScaleBar";
import { TreeBranch } from "./components/TreeBranch";
import {
  BRANCH_WIDTH,
  DRAG_THRESHOLD_PX,
  LABEL_FONT_SIZE,
  LABEL_WIDTH,
  MARGIN,
  NODE_RADIUS,
  SCALE_BAR_HEIGHT,
  SCALE_BAR_OFFSET,
  SCALE_BAR_TARGET_PIXELS,
} from "./constants";
import { useTreeSelection } from "./hooks/useTreeSelection";
import { computeLayout } from "./layouts";
import type { HierarchyPointNode, LayoutMode, PhyloTreeProps, Tree, TreeSelection } from "./types";
import { pruneCollapsed } from "./utils/collapse";
import { buildHierarchy, countLeaves, descendants } from "./utils/hierarchy";
import { applyOrder, computeReordered } from "./utils/reorder";
import { rerootOnBranch } from "./utils/reroot";
import { matchesQuery } from "./utils/search";
import { nodeInfo } from "./utils/treeOps";

export type {
  ColorFn,
  HierarchyPointNode,
  LayoutMode,
  LeafFn,
  PhyloTreeProps,
  Tree,
  TreeBranchStyle,
  TreeNodeInfo,
  TreeNodeStyle,
  TreeSelection,
} from "./types";
export { REROOT_ID } from "./utils/reroot";
export { midpointRoot } from "./utils/midpoint";
export { parseNewick, toNewick } from "./utils/newick";
export {
  applyTreeSelection,
  collapseBySupport,
  ladderizeOrder,
  leafOrder,
  orderForLeafNames,
  rotateOrder,
} from "./utils/treeOps";

type Node = HierarchyPointNode<Tree>;

function defaultColorFunction(node: Node): string {
  return node.data.name.split(" ").slice(0, -1).join();
}

/** A press on a node marker that may become a click or a sibling-reorder drag. */
interface MarkerPress {
  nodeId: string;
  startClientX: number;
  startClientY: number;
  /** Set once the pointer travels past the drag threshold and the node can be reordered. */
  drag: { parentId: string; order: string[]; startIndex: number } | null;
}

/**
 * @public
 * An interactive phylogenetic tree (SVG): rectangular phylogram, cladogram or radial layout, with
 * pan/zoom (scroll to pan, Ctrl/⌘-scroll to zoom), branch rerooting, collapsible clades, drag-to-
 * reorder siblings, per-node and per-branch styling, node/branch click callbacks for context
 * panels, leaf search, support values, branch-length labels and a scale bar.
 *
 * Interactive state — the `viewport` and the `selection` (root position, collapsed clades, sibling
 * order) — is controllable like every other stateful prop in this library. Node ids are stable
 * across reroots, so a selection, `nodeStyles` and `branchStyles` stay valid whatever the user does.
 * Pure helpers operate on the same `Tree` + `TreeSelection` pair: {@link midpointRoot},
 * {@link ladderizeOrder}, {@link rotateOrder}, {@link orderForLeafNames}, {@link collapseBySupport},
 * {@link applyTreeSelection}, {@link leafOrder}, {@link parseNewick} and {@link toNewick}.
 */
export function PhyloTree({
  tree,
  height = 900,
  width = 1000,
  cladogram = false,
  layout,
  showSupportValues = true,
  supportThreshold = 0,
  shadeBranchBySupport = true,
  colorFunction = defaultColorFunction,
  fontSize = 10,
  alignTips = true,
  leafTextComponent = defaultLeafText,
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  selection,
  defaultSelection,
  onSelectionChange,
  selectionStore,
  interactive = false,
  searchQuery,
  searchUseRegex = false,
  showScaleBar = true,
  showBranchLengths = false,
  branchWidth = BRANCH_WIDTH,
  nodeRadius = NODE_RADIUS,
  labelFontSize = LABEL_FONT_SIZE,
  leafSpacing,
  nodeStyles,
  branchStyles,
  activeNodeId,
  onNodeClick,
  onBranchClick,
  dragEnabled = interactive,
  onLeafOrderChange,
  svgRef,
}: PhyloTreeProps): JSX.Element {
  const effectiveLayout: LayoutMode = layout ?? (cladogram ? "cladogram" : "rectangular");
  const isRadial = effectiveLayout === "radial";
  // Rectangular/cladogram tips all point right, so only that side needs label room. Radial labels
  // fan out in every direction, so the allowance has to go on all four sides instead.
  const margin = useMemo(() => {
    const labelRoom = Math.min(LABEL_WIDTH, Math.round(width * 0.3));
    if (isRadial) {
      const even = Math.round(labelRoom / 2);
      return { top: even, bottom: even, left: even, right: even };
    }
    return { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: labelRoom };
  }, [width, isRadial]);

  const [currentSelection, setSelection] = useTreeSelection({
    selection,
    defaultSelection,
    onSelectionChange,
    selectionStore,
  });

  // Live preview of an in-progress sibling reorder drag — kept as local, ephemeral state (not
  // part of the controllable `selection`) so dragging doesn't spam `onSelectionChange` on every
  // pixel of movement; the real `selection.order` update happens once, on release.
  const [previewOrder, setPreviewOrderState] = useState<{ parentId: string; order: string[] } | null>(null);
  // Mirrored in a ref so the release handler can commit the final preview without a state updater
  // with side effects (StrictMode runs updaters twice).
  const previewRef = useRef<{ parentId: string; order: string[] } | null>(null);
  const setPreviewOrder = useCallback((next: { parentId: string; order: string[] } | null) => {
    previewRef.current = next;
    setPreviewOrderState(next);
  }, []);

  // Cladogram ignores branch length, so it never gets a scale bar (its layout reports no scaling
  // factor) — only reserve vertical space when one might actually be drawn.
  const scaleBarSpace = showScaleBar && effectiveLayout !== "cladogram" ? SCALE_BAR_HEIGHT : 0;

  // Topology for the current selection, before collapse: ids here are the original tree's, which
  // is what keeps every id in the selection meaningful across reroots.
  const baseRoot = useMemo(() => buildHierarchy(tree), [tree]);
  const arranged = useMemo(() => {
    let root = baseRoot;
    if (currentSelection.rerootedAt) root = rerootOnBranch(root, currentSelection.rerootedAt, currentSelection.rerootPosition);
    const order = currentSelection.order ?? {};
    if (Object.keys(order).length > 0) root = applyOrder(root, order);
    return root;
  }, [baseRoot, currentSelection.rerootedAt, currentSelection.rerootPosition, currentSelection.order]);

  const collapsedSet = useMemo(() => new Set(currentSelection.collapsed), [currentSelection.collapsed]);

  const { nodes, root, tipColumnY, layoutResult, sizeX, contentHeight } = useMemo(() => {
    let displayRoot = arranged;
    if (previewOrder) displayRoot = applyOrder(displayRoot, { [previewOrder.parentId]: previewOrder.order });
    if (currentSelection.collapsed.length > 0) displayRoot = pruneCollapsed(displayRoot, currentSelection.collapsed);

    const tipCount = countLeaves(displayRoot);
    const fitSizeX = height - margin.top - margin.bottom - scaleBarSpace;
    const sizeXValue = leafSpacing && !isRadial ? Math.max(0, (tipCount - 1) * leafSpacing) : fitSizeX;
    const sizeYValue = width - margin.left - margin.right;
    const result = computeLayout(effectiveLayout, displayRoot, sizeXValue, sizeYValue);

    return {
      root: displayRoot,
      nodes: descendants(displayRoot).filter((node) => node.parent),
      tipColumnY: sizeYValue,
      layoutResult: result,
      sizeX: sizeXValue,
      contentHeight: Math.max(height, sizeXValue + margin.top + margin.bottom + scaleBarSpace),
    };
  }, [arranged, previewOrder, currentSelection.collapsed, effectiveLayout, height, width, margin, scaleBarSpace, leafSpacing, isRadial]);

  // Report leaf order (collapsed clades' leaves included) whenever the committed arrangement changes.
  const onLeafOrderChangeRef = useRef(onLeafOrderChange);
  onLeafOrderChangeRef.current = onLeafOrderChange;
  const leafNames = useMemo(() => descendants(arranged).filter((node) => !node.children).map((node) => node.data.name), [arranged]);
  const leafKey = leafNames.join("\u0000");
  useEffect(() => {
    onLeafOrderChangeRef.current?.(leafNames);
    // Keyed on the joined names so an equal order recomputed on re-render doesn't re-notify.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafKey]);

  const extent = useMemo(() => ({ xMin: 0, xMax: width, yMin: 0, yMax: contentHeight }), [width, contentHeight]);
  const initialViewport = useMemo(
    () => ({ x0: 0, x1: width, y0: 0, y1: Math.min(height, contentHeight), ...extent }),
    // Seeds uncontrolled state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const {
    viewport: currentViewport,
    setViewport,
    panBy,
    zoomBy,
    zoomAt,
    reset,
  } = useViewport({ extent, viewport, defaultViewport: defaultViewport ?? initialViewport, onViewportChange, viewportStore });

  // Keep the window inside the content when it grows or shrinks (collapse, leafSpacing, layout).
  useEffect(() => {
    if (currentViewport.yMax !== extent.yMax || currentViewport.xMax !== extent.xMax) {
      setViewport((prev) => {
        const spanY = Math.min(prev.y1 - prev.y0, extent.yMax);
        const y0 = Math.max(0, Math.min(prev.y0, extent.yMax - spanY));
        return { ...prev, ...extent, y0, y1: y0 + spanY, x1: Math.min(prev.x1, extent.xMax) };
      });
    }
  }, [extent, currentViewport.xMax, currentViewport.yMax, setViewport]);

  const spanX = currentViewport.x1 - currentViewport.x0;
  const spanY = currentViewport.y1 - currentViewport.y0;
  const unitsPerPixelX = width > 0 ? spanX / width : 0;
  const unitsPerPixelY = height > 0 ? spanY / height : 0;

  const dragHandlers = useDragPan({
    onPan: (dx, dy) => panBy(dx, dy),
    scaleX: unitsPerPixelX,
    scaleY: unitsPerPixelY,
  });

  const wheel = useWheelZoom({
    onPan: (dx, dy) => panBy(dx * unitsPerPixelX, dy * unitsPerPixelY),
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX, pixelY) => ({
      x: currentViewport.x0 + pixelX * unitsPerPixelX,
      y: currentViewport.y0 + pixelY * unitsPerPixelY,
    }),
  });

  // ---- node gestures: click (inspect/collapse) vs drag (reorder among siblings) ----------------
  // Everything a gesture reads lives in refs, so the handlers are stable and the memoised tree body
  // below doesn't re-render on every pan.
  const latest = useRef({ root, nodes, unitsPerPixelY, sizeX, collapsedSet, onNodeClick, interactive, dragEnabled });
  latest.current = { root, nodes, unitsPerPixelY, sizeX, collapsedSet, onNodeClick, interactive, dragEnabled };
  const pressRef = useRef<MarkerPress | null>(null);

  const findNode = (id: string) => latest.current.nodes.find((node) => node.id === id);

  const toggleCollapse = useCallback(
    (id: string) =>
      setSelection((prev: TreeSelection) => ({
        ...prev,
        collapsed: prev.collapsed.includes(id) ? prev.collapsed.filter((c) => c !== id) : [...prev.collapsed, id],
      })),
    [setSelection]
  );

  const markerHandlers: NodeMarkerHandlers = useMemo(
    () => ({
      onPointerDown: (nodeId, event) => {
        if (event.button > 0) return;
        event.stopPropagation();
        pressRef.current = { nodeId, startClientX: event.clientX, startClientY: event.clientY, drag: null };
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          // ignore
        }
      },
      onPointerMove: (event) => {
        const press = pressRef.current;
        if (!press) return;
        const { dragEnabled: canDrag, unitsPerPixelY: perPixel, sizeX: spread, root: displayRoot } = latest.current;
        if (!press.drag) {
          if (!canDrag || Math.hypot(event.clientX - press.startClientX, event.clientY - press.startClientY) < DRAG_THRESHOLD_PX) return;
          const node = findNode(press.nodeId);
          if (!node?.parent?.children) return;
          const order = node.parent.children.map((child) => child.id);
          press.drag = { parentId: node.parent.id, order, startIndex: order.indexOf(node.id) };
        }
        const tipCount = countLeaves(displayRoot);
        const siblingSpacing = tipCount > 1 ? spread / (tipCount - 1) : spread;
        const steps = siblingSpacing > 0 ? Math.round(((event.clientY - press.startClientY) * perPixel) / siblingSpacing) : 0;
        const next = computeReordered(press.drag.order, press.nodeId, press.drag.startIndex + steps);
        const current = previewRef.current;
        if (!current || current.parentId !== press.drag.parentId || current.order.join() !== next.join()) {
          setPreviewOrder({ parentId: press.drag.parentId, order: next });
        }
      },
      onPointerUp: (event) => {
        const press = pressRef.current;
        pressRef.current = null;
        try {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        } catch {
          // ignore
        }
        if (!press) return;
        if (press.drag) {
          const preview = previewRef.current;
          setPreviewOrder(null);
          if (preview && event.type !== "pointercancel") {
            setSelection((prev: TreeSelection) => ({ ...prev, order: { ...prev.order, [preview.parentId]: preview.order } }));
          }
          return;
        }
        if (event.type === "pointercancel") return;
        const node = findNode(press.nodeId);
        if (!node) return;
        const { onNodeClick: onClick, interactive: canCollapse, collapsedSet: collapsed } = latest.current;
        if (onClick) onClick(nodeInfo(node, collapsed, event), event);
        else if (canCollapse && (node.children || collapsed.has(node.id))) toggleCollapse(node.id);
      },
    }),
    // Reads everything else through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setSelection, toggleCollapse, setPreviewOrder]
  );

  const onBranchClickRef = useRef(onBranchClick);
  onBranchClickRef.current = onBranchClick;
  const handleBranchClick = useCallback((nodeId: string, event: React.MouseEvent) => {
    const node = findNode(nodeId);
    if (node) onBranchClickRef.current?.(nodeInfo(node, latest.current.collapsedSet, event), event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Present only for radial; passing it down is what selects the polar geometry in the renderers.
  const radial = useMemo(
    () =>
      layoutResult.center !== undefined && layoutResult.maxRadius !== undefined
        ? { center: layoutResult.center, maxRadius: layoutResult.maxRadius }
        : undefined,
    [layoutResult]
  );

  const isSearchActive = Boolean(searchQuery);
  const showInternalMarkers = interactive || Boolean(onNodeClick);
  const markersInteractive = showInternalMarkers || dragEnabled;

  // The tree body depends on topology, layout and styling — never on the viewport — so panning and
  // zooming only change the <svg>'s viewBox instead of re-rendering thousands of elements.
  const body = useMemo(
    () => (
      <g transform={`translate(${margin.left},${margin.top})`}>
        {nodes.map((node) => {
          const isCollapsed = collapsedSet.has(node.id) && node.collapsedLeafCount !== undefined;
          const isLeaf = !node.children && !isCollapsed;
          const style = nodeStyles?.[node.id];
          return (
            <React.Fragment key={node.id}>
              <TreeBranch
                node={node}
                shadeBranchBySupport={shadeBranchBySupport}
                center={radial?.center}
                color={branchStyles?.[node.id]?.color ?? style?.color}
                width={branchWidth}
                onClick={onBranchClick ? handleBranchClick : undefined}
              />
              {showBranchLengths && <BranchLengthLabel node={node} fontSize={fontSize} center={radial?.center} />}
              {isLeaf && (
                <LeafNode
                  node={node}
                  leafTextComponent={leafTextComponent}
                  alignTips={alignTips}
                  tipColumnY={tipColumnY}
                  radial={radial}
                  isSearchActive={isSearchActive}
                  isSearchMatch={isSearchActive ? matchesQuery(node.data.name, searchQuery ?? "", searchUseRegex) : undefined}
                  color={style?.color}
                  bold={style?.bold}
                  fontSize={labelFontSize}
                />
              )}
              {isCollapsed && (
                <CollapsedClade
                  node={node}
                  color={style?.color}
                  fontSize={labelFontSize}
                  labelX={alignTips ? tipColumnY + 10 : node.y}
                  radial={radial}
                />
              )}
              {!isLeaf && !isCollapsed && showSupportValues && (
                <InternalNode node={node} fontSize={fontSize} threshold={supportThreshold} />
              )}
            </React.Fragment>
          );
        })}
        {/* Markers paint last, on top of every branch — see NodeMarker's own doc. */}
        {nodes.map((node) => {
          const isCollapsed = collapsedSet.has(node.id) && node.collapsedLeafCount !== undefined;
          const isLeaf = !node.children && !isCollapsed;
          if (!isLeaf && !showInternalMarkers) return null;
          const styleColor = nodeStyles?.[node.id]?.color;
          const fill = isLeaf
            ? (styleColor ?? randomColor({ seed: colorFunction(node) }))
            : isCollapsed
              ? (styleColor ?? "currentColor")
              : "var(--background, white)";
          return (
            <NodeMarker
              key={node.id}
              node={node}
              radius={isLeaf ? nodeRadius : nodeRadius + 0.5}
              fill={fill}
              isActive={activeNodeId === node.id}
              isInteractive={markersInteractive}
              isDraggable={dragEnabled}
              title={isLeaf ? undefined : isCollapsed ? "Expand" : "Collapse"}
              handlers={markersInteractive ? markerHandlers : undefined}
            />
          );
        })}
        {showScaleBar && layoutResult.scalingFactor !== undefined && (
          <ScaleBar
            scalingFactor={layoutResult.scalingFactor}
            targetPixels={SCALE_BAR_TARGET_PIXELS}
            x={0}
            y={(isRadial ? height - margin.top - margin.bottom - scaleBarSpace : sizeX) + SCALE_BAR_OFFSET}
          />
        )}
      </g>
    ),
    [
      nodes,
      margin,
      collapsedSet,
      nodeStyles,
      branchStyles,
      shadeBranchBySupport,
      radial,
      branchWidth,
      onBranchClick,
      handleBranchClick,
      showBranchLengths,
      fontSize,
      leafTextComponent,
      alignTips,
      tipColumnY,
      isSearchActive,
      searchQuery,
      searchUseRegex,
      labelFontSize,
      showSupportValues,
      supportThreshold,
      showInternalMarkers,
      colorFunction,
      nodeRadius,
      activeNodeId,
      markersInteractive,
      dragEnabled,
      markerHandlers,
      showScaleBar,
      layoutResult,
      isRadial,
      height,
      scaleBarSpace,
      sizeX,
    ]
  );

  const wheelRef = wheel.ref;
  const setSvgElement = useCallback(
    (element: SVGSVGElement | null) => {
      wheelRef(element);
      if (typeof svgRef === "function") svgRef(element);
      else if (svgRef) (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = element;
    },
    [wheelRef, svgRef]
  );

  return (
    <div className={`${ROOT_CLASS} tree text-foreground`}>
      <ViewportToolbar viewport={currentViewport} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="both" />
      <svg
        ref={setSvgElement}
        width={width}
        height={height}
        viewBox={`${currentViewport.x0} ${currentViewport.y0} ${spanX} ${spanY}`}
        style={{ touchAction: "none" }}
        {...dragHandlers}
      >
        {body}
      </svg>
    </div>
  );
}
