import { useCallback, useMemo, useRef, useState } from "react";
import React from "react";
import { useDragPan, useViewport, useWheelZoom, ViewportToolbar } from "@react-bio-viz/core";

import { CollapseMarker } from "./components/CollapseMarker";
import { InternalNode } from "./components/InternalNode";
import { defaultLeafText, LeafNode } from "./components/LeafNode";
import { ScaleBar } from "./components/ScaleBar";
import { TreeBranch } from "./components/TreeBranch";
import {
  LABEL_WIDTH,
  MARGIN,
  SCALE_BAR_HEIGHT,
  SCALE_BAR_OFFSET,
  SCALE_BAR_TARGET_PIXELS,
} from "./constants";
import { useTreeSelection } from "./hooks/useTreeSelection";
import { computeLayout } from "./layouts";
import type { HierarchyPointNode, LayoutMode, PhyloTreeProps, Tree, TreeSelection } from "./types";
import { pruneCollapsed } from "./utils/collapse";
import { buildHierarchy, descendants } from "./utils/hierarchy";
import { applyOrder, computeReordered } from "./utils/reorder";
import { rerootTree } from "./utils/reroot";
import { matchesQuery } from "./utils/search";

export type { ColorFn, HierarchyPointNode, LayoutMode, LeafFn, PhyloTreeProps, Tree, TreeSelection } from "./types";

function defaultColorFunction(node: HierarchyPointNode<Tree>): string {
  const { data } = node;
  const { name } = data;
  return name.split(" ").slice(0, -1).join();
}

interface ReorderDrag {
  parentId: string;
  order: string[];
  draggedId: string;
  startIndex: number;
  startClientY: number;
}

/**
 * @public
 * @returns JSX.Element
 */
export function PhyloTree({
  tree,
  height = 900,
  width = 1000,
  cladogram = false,
  layout,
  showSupportValues = true,
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
}: PhyloTreeProps): JSX.Element {
  const effectiveLayout: LayoutMode = layout ?? (cladogram ? "cladogram" : "rectangular");
  // Rectangular/cladogram tips all point right, so only that side needs label room. Radial labels
  // fan out in every direction, so the allowance has to go on all four sides instead.
  const margin = useMemo(() => {
    const labelRoom = Math.min(LABEL_WIDTH, Math.round(width * 0.3));
    if (effectiveLayout === "radial") {
      const even = Math.round(labelRoom / 2);
      return { top: even, bottom: even, left: even, right: even };
    }
    return { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: labelRoom };
  }, [width, effectiveLayout]);

  const [currentSelection, setSelection] = useTreeSelection({
    selection,
    defaultSelection,
    onSelectionChange,
    selectionStore,
  });

  // Live preview of an in-progress sibling reorder drag — kept as local, ephemeral state (not
  // part of the controllable `selection`) so dragging doesn't spam `onSelectionChange` on every
  // pixel of movement; the real `selection.order` update happens once, on release.
  const [previewOrder, setPreviewOrder] = useState<{ parentId: string; order: string[] } | null>(null);
  const reorderDragRef = useRef<ReorderDrag | null>(null);

  const isSearchActive = Boolean(searchQuery);
  // Cladogram ignores branch length, so it never gets a scale bar (its layout reports no scaling
  // factor) — only reserve vertical space when one might actually be drawn.
  const scaleBarSpace = showScaleBar && effectiveLayout !== "cladogram" ? SCALE_BAR_HEIGHT : 0;

  const { nodes, tipColumnY, collapsibleIds, layoutResult, sizeX, numLeaves } = useMemo(() => {
    const sizeXValue = height - margin.top - margin.bottom - scaleBarSpace;
    const sizeYValue = width - margin.left - margin.right;

    let root = buildHierarchy(tree);
    if (currentSelection.rerootedAt) {
      root = rerootTree(root, currentSelection.rerootedAt);
    }
    // Which ids have children in the *pre-collapse* topology — a currently-collapsed node still
    // needs to keep its marker (rendered as a leaf-like tip, but still expandable), so eligibility
    // is checked before pruning strips its children away.
    const ids = new Set(descendants(root).filter((node) => node.children).map((node) => node.id));

    if (currentSelection.collapsed.length > 0) {
      root = pruneCollapsed(root, currentSelection.collapsed);
    }

    const effectiveOrder = {
      ...currentSelection.order,
      ...(previewOrder ? { [previewOrder.parentId]: previewOrder.order } : {}),
    };
    if (Object.keys(effectiveOrder).length > 0) {
      root = applyOrder(root, effectiveOrder);
    }

    const result = computeLayout(effectiveLayout, root, sizeXValue, sizeYValue);

    const allNodes = descendants(root).filter((node) => node.parent);
    const leafCount = allNodes.filter((node) => typeof node.children === "undefined").length;

    return {
      nodes: allNodes,
      tipColumnY: sizeYValue,
      collapsibleIds: ids,
      layoutResult: result,
      sizeX: sizeXValue,
      numLeaves: leafCount,
    };
  }, [
    tree,
    currentSelection.rerootedAt,
    currentSelection.collapsed,
    currentSelection.order,
    previewOrder,
    effectiveLayout,
    height,
    width,
    margin,
    scaleBarSpace,
  ]);

  const extent = useMemo(() => ({ xMin: 0, xMax: width, yMin: 0, yMax: height }), [width, height]);

  const {
    viewport: currentViewport,
    panBy,
    zoomBy,
    zoomAt,
    reset,
  } = useViewport({
    extent,
    viewport,
    defaultViewport,
    onViewportChange,
    viewportStore,
  });

  const spanX = currentViewport.x1 - currentViewport.x0;
  const spanY = currentViewport.y1 - currentViewport.y0;

  const dragHandlers = useDragPan({
    onPan: (dx, dy) => panBy(dx, dy),
    scaleX: width > 0 ? spanX / width : 0,
    scaleY: height > 0 ? spanY / height : 0,
  });

  const wheelHandlers = useWheelZoom({
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX, pixelY) => ({
      x: currentViewport.x0 + (width > 0 ? (pixelX / width) * spanX : 0),
      y: currentViewport.y0 + (height > 0 ? (pixelY / height) * spanY : 0),
    }),
  });

  const toggleCollapse = useCallback(
    (id: string) => {
      setSelection((prev: TreeSelection) => ({
        ...prev,
        collapsed: prev.collapsed.includes(id) ? prev.collapsed.filter((c) => c !== id) : [...prev.collapsed, id],
      }));
    },
    [setSelection]
  );

  const scaleYForDrag = height > 0 ? spanY / height : 0;
  const siblingSpacing = numLeaves > 1 ? sizeX / (numLeaves - 1) : sizeX;

  const handleReorderPointerDown = useCallback(
    (node: HierarchyPointNode<Tree>, event: React.PointerEvent<SVGCircleElement>) => {
      if (!node.parent?.children) return;
      event.stopPropagation();
      const order = node.parent.children.map((c) => c.id);
      const startIndex = order.indexOf(node.id);
      reorderDragRef.current = { parentId: node.parent.id, order, draggedId: node.id, startIndex, startClientY: event.clientY };
      setPreviewOrder({ parentId: node.parent.id, order });
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    []
  );

  const handleReorderPointerMove = useCallback(
    (event: React.PointerEvent<SVGCircleElement>) => {
      const drag = reorderDragRef.current;
      if (!drag) return;
      const dyTree = (event.clientY - drag.startClientY) * scaleYForDrag;
      const steps = siblingSpacing > 0 ? Math.round(dyTree / siblingSpacing) : 0;
      const nextOrder = computeReordered(drag.order, drag.draggedId, drag.startIndex + steps);
      setPreviewOrder({ parentId: drag.parentId, order: nextOrder });
    },
    [scaleYForDrag, siblingSpacing]
  );

  const handleReorderPointerUp = useCallback(
    (event: React.PointerEvent<SVGCircleElement>) => {
      const drag = reorderDragRef.current;
      if (drag && previewOrder) {
        setSelection((prev: TreeSelection) => ({
          ...prev,
          order: { ...prev.order, [previewOrder.parentId]: previewOrder.order },
        }));
      }
      reorderDragRef.current = null;
      setPreviewOrder(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [previewOrder, setSelection]
  );

  const markerNodes = interactive ? nodes.filter((node) => collapsibleIds.has(node.id)) : [];

  // Present only for radial; passing it down is what selects the polar geometry in the renderers.
  const radial =
    layoutResult.center !== undefined && layoutResult.maxRadius !== undefined
      ? { center: layoutResult.center, maxRadius: layoutResult.maxRadius }
      : undefined;

  return (
    <div className="tree text-foreground">
      <ViewportToolbar viewport={currentViewport} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="both" />
      <svg
        width={width}
        height={height}
        viewBox={`${currentViewport.x0} ${currentViewport.y0} ${spanX} ${spanY}`}
        style={{ touchAction: "none" }}
        {...dragHandlers}
        {...wheelHandlers}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {nodes.map((node) => {
            const isLeaf = typeof node.children === "undefined";
            return (
              <React.Fragment key={node.id}>
                <TreeBranch node={node} shadeBranchBySupport={shadeBranchBySupport} center={radial?.center} />
                {isLeaf ? (
                  <LeafNode
                    node={node}
                    colorFunction={colorFunction}
                    leafTextComponent={leafTextComponent}
                    alignTips={alignTips}
                    tipColumnY={tipColumnY}
                    radial={radial}
                    isSearchActive={isSearchActive}
                    isSearchMatch={isSearchActive ? matchesQuery(node.data.name, searchQuery ?? "", searchUseRegex) : undefined}
                    onReorderPointerDown={interactive ? handleReorderPointerDown : undefined}
                    onReorderPointerMove={interactive ? handleReorderPointerMove : undefined}
                    onReorderPointerUp={interactive ? handleReorderPointerUp : undefined}
                  />
                ) : (
                  <InternalNode node={node} fontSize={fontSize} showSupportValues={showSupportValues} />
                )}
              </React.Fragment>
            );
          })}
          {/* Collapse markers paint last, on top of every branch — see CollapseMarker's own doc. */}
          {markerNodes.map((node) => (
            <CollapseMarker
              key={node.id}
              node={node}
              isCollapsed={currentSelection.collapsed.includes(node.id)}
              onToggle={toggleCollapse}
            />
          ))}
          {showScaleBar && layoutResult.scalingFactor !== undefined && (
            <ScaleBar
              scalingFactor={layoutResult.scalingFactor}
              targetPixels={SCALE_BAR_TARGET_PIXELS}
              x={0}
              y={sizeX + SCALE_BAR_OFFSET}
            />
          )}
        </g>
      </svg>
    </div>
  );
}
