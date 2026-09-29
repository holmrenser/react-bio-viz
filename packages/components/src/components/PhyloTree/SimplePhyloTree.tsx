import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCategoricalColorScale,
  ROOT_CLASS,
  useControllableState,
  useDragPan,
  useViewport,
  useWheelZoom,
  type Viewport,
} from "@react-bio-viz/core";

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
  EMPTY_SELECTION,
  LABEL_FONT_SIZE,
  LABEL_WIDTH,
  MARGIN,
  NODE_RADIUS,
  REROOT_DRAG_ZONE,
  SCALE_BAR_HEIGHT,
  SCALE_BAR_OFFSET,
  SCALE_BAR_TARGET_PIXELS,
} from "./constants";
import { computeLayout } from "./layouts";
import type { HierarchyPointNode, SimplePhyloTreeProps, Tree, TreeSelection } from "./types";
import { pruneCollapsed } from "./utils/collapse";
import { buildHierarchy, countLeaves, descendants } from "./utils/hierarchy";
import { applyOrder } from "./utils/reorder";
import { rerootOnBranch } from "./utils/reroot";
import { matchesQuery } from "./utils/search";
import { displayTips, nodeInfo, planDragReroot, planTipMove, rerootAbove } from "./utils/treeOps";

type Node = HierarchyPointNode<Tree>;

const leafColors = createCategoricalColorScale();

function defaultColorFunction(node: Node): string {
  return node.data.name.split(" ").slice(0, -1).join();
}

/** A press on a node marker that may become a click or a drag. */
interface MarkerPress {
  nodeId: string;
  startClientX: number;
  startClientY: number;
  /** The tree's `<svg>`, to map the pointer onto rows. */
  svg: SVGSVGElement | null;
  /** Set once the pointer travels past the drag threshold. */
  dragging: boolean;
}

/**
 * @public
 * @group Components
 * The tree inside {@link PhyloTree}, without its toolbar, and controlled: pan/zoom, collapsing and
 * dragging report through `onViewportChange` and `onSelectionChange`, and show once passed back as
 * `viewport` and `selection`.
 */
export function SimplePhyloTree(props: SimplePhyloTreeProps): React.JSX.Element {
  const {
    tree,
    height = 900,
    width = 1000,
    layout = "rectangular",
    showSupportValues = true,
    supportThreshold = 0,
    shadeBranchBySupport = true,
    colorFunction = defaultColorFunction,
    leafMarkerColor,
    fontSize = 10,
    alignTips = true,
    leafTextComponent = defaultLeafText,
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
    viewport,
    onViewportChange,
    selection,
    onSelectionChange,
  } = props;
  const isRadial = layout === "radial";
  // Rectangular tips point right, so only that side needs label room; radial labels fan out all round.
  const margin = useMemo(() => {
    const labelRoom = Math.min(LABEL_WIDTH, Math.round(width * 0.3));
    if (isRadial) {
      const even = Math.round(labelRoom / 2);
      return { top: even, bottom: even, left: even, right: even };
    }
    return { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: labelRoom };
  }, [width, isRadial]);

  const [currentSelection, setSelection] = useControllableState<TreeSelection>({
    value: selection ?? EMPTY_SELECTION,
    onChange: onSelectionChange,
  });

  // An in-progress drag's preview: local, so the selection changes once, on release. Mirrored in a
  // ref so the release handler can commit it.
  const [preview, setPreviewState] = useState<TreeSelection | null>(null);
  const previewRef = useRef<TreeSelection | null>(null);
  const setPreview = useCallback((next: TreeSelection | null) => {
    previewRef.current = next;
    setPreviewState(next);
  }, []);

  // A cladogram has no branch-length scale, so it never shows a scale bar.
  const scaleBarSpace = showScaleBar && layout !== "cladogram" ? SCALE_BAR_HEIGHT : 0;

  // Rerooted and reordered, not yet collapsed. Ids stay the original tree's throughout.
  const baseRoot = useMemo(() => buildHierarchy(tree), [tree]);
  const arrangeWith = useCallback(
    (arrangement: Pick<TreeSelection, "rerootedAt" | "rerootPosition" | "order">) => {
      let root = baseRoot;
      if (arrangement.rerootedAt) root = rerootOnBranch(root, arrangement.rerootedAt, arrangement.rerootPosition);
      const order = arrangement.order ?? {};
      if (Object.keys(order).length > 0) root = applyOrder(root, order);
      return root;
    },
    [baseRoot]
  );
  const arranged = useMemo(
    () => arrangeWith(currentSelection),
    // `collapsed` is applied separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arrangeWith, currentSelection.rerootedAt, currentSelection.rerootPosition, currentSelection.order]
  );

  const collapsedSet = useMemo(() => new Set(currentSelection.collapsed), [currentSelection.collapsed]);

  const { nodes, root, tipColumnY, layoutResult, sizeX, contentHeight } = useMemo(() => {
    let displayRoot = preview ? arrangeWith(preview) : arranged;
    if (currentSelection.collapsed.length > 0) displayRoot = pruneCollapsed(displayRoot, currentSelection.collapsed);

    const tipCount = countLeaves(displayRoot);
    const fitSizeX = height - margin.top - margin.bottom - scaleBarSpace;
    const sizeXValue = leafSpacing && !isRadial ? Math.max(0, (tipCount - 1) * leafSpacing) : fitSizeX;
    const sizeYValue = width - margin.left - margin.right;
    const result = computeLayout(layout, displayRoot, sizeXValue, sizeYValue);

    return {
      root: displayRoot,
      nodes: descendants(displayRoot).filter((node) => node.parent),
      tipColumnY: sizeYValue,
      layoutResult: result,
      sizeX: sizeXValue,
      contentHeight: Math.max(height, sizeXValue + margin.top + margin.bottom + scaleBarSpace),
    };
  }, [arranged, arrangeWith, preview, currentSelection.collapsed, layout, height, width, margin, scaleBarSpace, leafSpacing, isRadial]);

  // Report the committed leaf order (collapsed clades' leaves included) whenever it changes.
  const onLeafOrderChangeRef = useRef(onLeafOrderChange);
  onLeafOrderChangeRef.current = onLeafOrderChange;
  const leafNames = useMemo(() => descendants(arranged).filter((node) => !node.children).map((node) => node.data.name), [arranged]);
  const leafKey = leafNames.join("\u0000");
  useEffect(() => {
    onLeafOrderChangeRef.current?.(leafNames);
    // Keyed on the names, so an equal order recomputed on re-render doesn't re-notify.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafKey]);

  const extent = useMemo(() => ({ xMin: 0, xMax: width, yMin: 0, yMax: contentHeight }), [width, contentHeight]);
  const current = useMemo<Viewport>(
    () => viewport ?? { x0: 0, x1: width, y0: 0, y1: Math.min(height, contentHeight), ...extent },
    [viewport, width, height, contentHeight, extent]
  );
  const { setViewport, panBy, zoomAt } = useViewport({ extent, viewport: current, onViewportChange });

  // Keep the window inside the content when it grows or shrinks (collapse, leafSpacing, layout).
  useEffect(() => {
    if (current.yMax !== extent.yMax || current.xMax !== extent.xMax) {
      setViewport((prev) => {
        const spanY = Math.min(prev.y1 - prev.y0, extent.yMax);
        const y0 = Math.max(0, Math.min(prev.y0, extent.yMax - spanY));
        return { ...prev, ...extent, y0, y1: y0 + spanY, x1: Math.min(prev.x1, extent.xMax) };
      });
    }
  }, [extent, current.xMax, current.yMax, setViewport]);

  const spanX = current.x1 - current.x0;
  const spanY = current.y1 - current.y0;
  const unitsPerPixelX = width > 0 ? spanX / width : 0;
  const unitsPerPixelY = height > 0 ? spanY / height : 0;

  const dragHandlers = useDragPan({ onPan: (dx, dy) => panBy(dx, dy), scaleX: unitsPerPixelX, scaleY: unitsPerPixelY });
  const wheel = useWheelZoom({
    onPan: (dx, dy) => panBy(dx * unitsPerPixelX, dy * unitsPerPixelY),
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX, pixelY) => ({ x: current.x0 + pixelX * unitsPerPixelX, y: current.y0 + pixelY * unitsPerPixelY }),
  });

  // ---- node gestures: click (inspect/collapse) vs drag (reorder, or reroot past either end) -----
  // Gestures read everything through refs, so the handlers are stable and the memoised tree body
  // doesn't re-render on every pan.
  const viewportY0 = current.y0;
  const marginTop = margin.top;
  const latest = useRef({ tree, currentSelection, root, nodes, unitsPerPixelY, viewportY0, marginTop, collapsedSet, onNodeClick, interactive, dragEnabled, isRadial });
  latest.current = { tree, currentSelection, root, nodes, unitsPerPixelY, viewportY0, marginTop, collapsedSet, onNodeClick, interactive, dragEnabled, isRadial };

  const findNode = (id: string) => latest.current.nodes.find((node) => node.id === id);
  const describe = (node: Node, event: { clientX: number; clientY: number }) =>
    nodeInfo(node, latest.current.collapsedSet, event, rerootAbove(latest.current.tree, latest.current.currentSelection, node.id));

  const toggleCollapse = useCallback(
    (id: string) =>
      setSelection((prev) => ({
        ...prev,
        collapsed: prev.collapsed.includes(id) ? prev.collapsed.filter((c) => c !== id) : [...prev.collapsed, id],
      })),
    [setSelection]
  );

  // A drag follows the pointer on the window rather than capturing it on the marker: the preview
  // moves marker elements, and moving a captured element drops the capture (and the release).
  const endGestureRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  useEffect(() => () => endGestureRef.current?.(), []);

  const markerHandlers: NodeMarkerHandlers = useMemo(
    () => ({
      onPointerDown: (nodeId, event) => {
        if (event.button > 0) return;
        event.stopPropagation();
        // Otherwise the compatibility mousedown starts a text selection across the leaf labels.
        event.preventDefault();
        endGestureRef.current?.();
        const press: MarkerPress = {
          nodeId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          svg: (event.currentTarget as SVGGraphicsElement).ownerSVGElement,
          dragging: false,
        };

        const onMove = (move: PointerEvent) => {
          const {
            dragEnabled: canDrag,
            isRadial: radialLayout,
            unitsPerPixelY: perPixel,
            viewportY0: y0,
            marginTop: top,
            root: displayRoot,
            collapsedSet: collapsed,
          } = latest.current;
          if (!press.dragging) {
            if (!canDrag || radialLayout || Math.hypot(move.clientX - press.startClientX, move.clientY - press.startClientY) < DRAG_THRESHOLD_PX) return;
            press.dragging = true;
          }
          // The row under the pointer, in layout units along the tip axis.
          const tips = displayTips(displayRoot, collapsed);
          if (tips.length < 2) return;
          const spacing = (tips[tips.length - 1].x - tips[0].x) / (tips.length - 1) || 1;
          const svgTop = press.svg?.getBoundingClientRect().top ?? 0;
          const y = (move.clientY - svgTop) * perPixel + y0 - top;
          const { tree: source, currentSelection: selectionNow } = latest.current;
          let next: TreeSelection | null;
          if (y < tips[0].x - REROOT_DRAG_ZONE * spacing) {
            next = planDragReroot(source, selectionNow, press.nodeId, "above");
          } else if (y > tips[tips.length - 1].x + REROOT_DRAG_ZONE * spacing) {
            next = planDragReroot(source, selectionNow, press.nodeId, "below");
          } else {
            const order = planTipMove(source, selectionNow, press.nodeId, Math.round((y - tips[0].x) / spacing));
            next = order ? { ...selectionNow, order } : null;
          }
          if (JSON.stringify(next) !== JSON.stringify(previewRef.current)) setPreview(next);
        };

        const onEnd = (end: PointerEvent) => {
          cleanup();
          if (!press.dragging) return;
          // A drag that ends back on the marker still produces a click; it isn't one.
          suppressClickRef.current = press.nodeId;
          const committed = previewRef.current;
          setPreview(null);
          if (committed && end.type !== "pointercancel") {
            setSelection((prev) => ({
              ...prev,
              rerootedAt: committed.rerootedAt,
              rerootPosition: committed.rerootPosition,
              order: committed.order,
            }));
          }
        };

        const cleanup = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onEnd);
          window.removeEventListener("pointercancel", onEnd);
          endGestureRef.current = null;
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onEnd);
        window.addEventListener("pointercancel", onEnd);
        endGestureRef.current = cleanup;
      },
      onClick: (nodeId, event) => {
        event.stopPropagation();
        const suppressed = suppressClickRef.current === nodeId;
        suppressClickRef.current = null;
        if (suppressed) return;
        const node = findNode(nodeId);
        if (!node) return;
        const { onNodeClick: onNodeClickNow, interactive: canCollapse, collapsedSet: collapsedNow } = latest.current;
        if (onNodeClickNow) onNodeClickNow(describe(node, event), event);
        else if (canCollapse && (node.children || collapsedNow.has(node.id))) toggleCollapse(node.id);
      },
    }),
    // Everything else is read through `latest`.
    [setSelection, toggleCollapse, setPreview]
  );

  const onBranchClickRef = useRef(onBranchClick);
  onBranchClickRef.current = onBranchClick;
  const handleBranchClick = useCallback((nodeId: string, event: React.MouseEvent) => {
    const node = findNode(nodeId);
    if (node) onBranchClickRef.current?.(describe(node, event), event);
  }, []);

  // Radial only; passing it down is what selects the polar geometry in the renderers.
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

  // Independent of the viewport: panning and zooming only change the <svg>'s viewBox.
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
        {/* Markers paint last, above every branch — see NodeMarker. */}
        {nodes.map((node) => {
          const isCollapsed = collapsedSet.has(node.id) && node.collapsedLeafCount !== undefined;
          const isLeaf = !node.children && !isCollapsed;
          if (!isLeaf && !showInternalMarkers) return null;
          const styleColor = nodeStyles?.[node.id]?.color;
          const fill = isLeaf
            ? (styleColor ?? leafMarkerColor ?? leafColors(colorFunction(node)).base)
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
      leafMarkerColor,
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
      <svg
        ref={setSvgElement}
        width={width}
        height={height}
        viewBox={`${current.x0} ${current.y0} ${spanX} ${spanY}`}
        style={{ touchAction: "none", userSelect: "none" }}
        {...dragHandlers}
      >
        {body}
      </svg>
    </div>
  );
}
