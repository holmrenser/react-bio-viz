import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "@emotion/css";
import {
  clampToExtent,
  moveItem,
  ResizeHandle,
  resolveRowOrder,
  ROOT_CLASS,
  RowLabels,
  useControllableState,
  useDarkMode,
  useDragPan,
  useViewport,
  useWheelZoom,
  ViewportToolbar,
  type RowReorderPreview,
} from "@react-bio-viz/core";

import { ColumnHeader } from "./components/ColumnHeader";
import { HeatmapCanvas } from "./components/HeatmapCanvas";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DIVIDER_SIZE,
  HEADER_HEIGHT,
  LABEL_WIDTH,
  LABEL_WIDTH_LIMITS,
  MAX_CELL_SIZE,
  NUMBER_DECIMALS,
  TOOLBAR_HEIGHT,
} from "./constants";
import type { DistanceMatrixHover, DistanceMatrixPanelSizes, DistanceMatrixProps } from "./types";
import { maxDistance } from "./utils/colors";

export type {
  DistanceColorScheme,
  DistanceMatrixHover,
  DistanceMatrixOptions,
  DistanceMatrixPanelSizes,
  DistanceMatrixProps,
} from "./types";
export { distanceColor } from "./utils/colors";

const NO_ORDER: string[] = [];

/**
 * @public
 * A pairwise distance matrix as a heatmap: row names on the left, rotated column names on top,
 * cells shaded by distance (four palettes) with the value written in once cells are large enough.
 * Rendered on canvas and windowed, so it scales to thousands of sequences where a DOM grid can't.
 *
 * Scroll to pan, Ctrl/⌘-scroll to zoom, drag to pan; drag row names to reorder rows and columns
 * together. The `viewport`, `rowOrder` and `panelSizes` are controllable like every stateful prop
 * in this library — and `rowOrder` has the same shape as the MSA's, so one store can keep an
 * alignment, its tree and its distance matrix in the same order.
 */
export function DistanceMatrix({
  labels,
  matrix,
  labelNames,
  width = 650,
  height = 500,
  options,
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  rowOrder: rowOrderProp,
  defaultRowOrder,
  onRowOrderChange,
  rowOrderStore,
  panelSizes: panelSizesProp,
  defaultPanelSizes,
  onPanelSizesChange,
  panelSizesStore,
  onHoverChange,
}: DistanceMatrixProps): React.JSX.Element {
  const systemDarkMode = useDarkMode();
  const {
    showNumbers = true,
    colorScheme = "warm",
    cellWidth = CELL_WIDTH,
    cellHeight = CELL_HEIGHT,
    showToolbar = true,
    showLabels = true,
    reorderableRows = true,
    darkMode = systemDarkMode,
  } = options ?? {};

  const [rowOrder, setRowOrder] = useControllableState<string[]>({
    value: rowOrderProp,
    defaultValue: defaultRowOrder ?? NO_ORDER,
    onChange: onRowOrderChange,
    store: rowOrderStore,
  });
  const seededPanelSizes = useMemo<DistanceMatrixPanelSizes>(
    () => ({ labelWidth: defaultPanelSizes?.labelWidth ?? LABEL_WIDTH }),
    // Seeds only matter on mount, like every `default*` prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [panelSizes, setPanelSizes] = useControllableState<DistanceMatrixPanelSizes>({
    value: panelSizesProp,
    defaultValue: seededPanelSizes,
    onChange: onPanelSizesChange,
    store: panelSizesStore,
  });

  const n = labels.length;
  const order = useMemo(() => resolveRowOrder(labels, rowOrder), [labels, rowOrder]);
  const [preview, setPreview] = useState<RowReorderPreview | null>(null);
  const renderedOrder = useMemo(() => (preview ? moveItem(order, preview.from, preview.to) : order), [order, preview]);
  const nameOf = useCallback((id: string) => labelNames?.[id] ?? id, [labelNames]);
  const maxValue = useMemo(() => maxDistance(matrix), [matrix]);

  const labelSpace = showLabels ? panelSizes.labelWidth + DIVIDER_SIZE : 0;
  const gridWidth = Math.max(cellWidth, width - labelSpace);
  // `height` is a maximum: a small matrix takes only the height its rows need.
  const gridHeight = Math.max(cellHeight, Math.min(n * cellHeight, height - (showToolbar ? TOOLBAR_HEIGHT : 0) - HEADER_HEIGHT));

  // At least the grid at the default cell size, so a small matrix isn't stretched to fill it.
  const extent = useMemo(
    () => ({ xMin: 0, xMax: Math.max(1, n, gridWidth / cellWidth), yMin: 0, yMax: Math.max(1, n, gridHeight / cellHeight) }),
    [n, gridWidth, gridHeight, cellWidth, cellHeight]
  );
  const initialViewport = useMemo(
    () => clampToExtent({ x0: 0, x1: gridWidth / cellWidth, y0: 0, y1: gridHeight / cellHeight, ...extent }),
    // Seeds uncontrolled state only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const { viewport: current, setViewport, panBy, zoomBy, zoomAt } = useViewport({
    extent,
    viewport,
    defaultViewport: defaultViewport ?? initialViewport,
    onViewportChange,
    viewportStore,
  });

  useEffect(() => {
    if (current.xMax !== extent.xMax || current.yMax !== extent.yMax) setViewport((prev) => clampToExtent({ ...prev, ...extent }));
  }, [extent, current.xMax, current.yMax, setViewport]);

  const spanX = current.x1 - current.x0;
  const spanY = current.y1 - current.y0;
  const cellW = gridWidth / spanX;
  const cellH = gridHeight / spanY;
  const limit = (factor: number, span: number, pixels: number) => Math.max(factor, pixels / MAX_CELL_SIZE / span);

  const dragHandlers = useDragPan({ onPan: (dx, dy) => panBy(dx, dy), scaleX: 1 / cellW, scaleY: 1 / cellH });
  const wheel = useWheelZoom({
    onPan: (dx, dy) => panBy(dx / cellW, dy / cellH),
    onZoom: (point, factor) => zoomAt(point, limit(factor, spanX, gridWidth), limit(factor, spanY, gridHeight)),
    toDataPoint: (x, y) => ({ x: current.x0 + x / cellW, y: current.y0 + y / cellH }),
  });

  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const [labelHover, setLabelHover] = useState<number | null>(null);
  const onHoverChangeRef = useRef(onHoverChange);
  onHoverChangeRef.current = onHoverChange;
  const updateHover = useCallback(
    (cell: { row: number; col: number } | null, event?: { clientX: number; clientY: number }) => {
      setHover(cell);
      if (!onHoverChangeRef.current) return;
      if (!cell || !event) return onHoverChangeRef.current(null);
      const i = renderedOrder[cell.row];
      const j = renderedOrder[cell.col];
      const hovered: DistanceMatrixHover = {
        rowId: labels[i],
        columnId: labels[j],
        value: matrix[i]?.[j] ?? Number.NaN,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      onHoverChangeRef.current(hovered);
    },
    [renderedOrder, labels, matrix]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      dragHandlers.onPointerMove(event);
      const rect = event.currentTarget.getBoundingClientRect();
      const col = Math.floor(current.x0 + (event.clientX - rect.left) / cellW);
      const row = Math.floor(current.y0 + (event.clientY - rect.top) / cellH);
      updateHover(row >= 0 && row < n && col >= 0 && col < n ? { row, col } : null, event);
    },
    [dragHandlers, current.x0, current.y0, cellW, cellH, n, updateHover]
  );

  const rows = useMemo(() => order.map((index) => ({ id: labels[index], label: nameOf(labels[index]) })), [order, labels, nameOf]);
  const columnNames = useMemo(() => renderedOrder.map((index) => nameOf(labels[index])), [renderedOrder, labels, nameOf]);
  const commitReorder = useCallback(
    (from: number, to: number) => setRowOrder(moveItem(order.map((index) => labels[index]), from, to)),
    [order, labels, setRowOrder]
  );

  const hoverRow = hover?.row ?? labelHover;
  const tooltip =
    hover && renderedOrder[hover.row] !== renderedOrder[hover.col]
      ? `${nameOf(labels[renderedOrder[hover.row]])} × ${nameOf(labels[renderedOrder[hover.col]])}: ${(
          matrix[renderedOrder[hover.row]]?.[renderedOrder[hover.col]] ?? Number.NaN
        ).toFixed(NUMBER_DECIMALS)}`
      : null;

  return (
    <div className={cx(ROOT_CLASS, "text-foreground", css({ display: "flex", flexDirection: "column", width }))}>
      {showToolbar && (
        <div style={{ height: TOOLBAR_HEIGHT }}>
          <ViewportToolbar
            viewport={current}
            panBy={panBy}
            zoomBy={(factor) => zoomBy(limit(factor, Math.min(spanX, spanY), Math.min(gridWidth, gridHeight)))}
            reset={() => setViewport(initialViewport)}
            axes="both"
          />
        </div>
      )}
      <div className={css({ display: "flex" })}>
        <div
          className="shrink-0 overflow-hidden px-1 text-xs text-muted-foreground"
          style={{ width: labelSpace, height: HEADER_HEIGHT, display: "flex", alignItems: "flex-end" }}
        >
          {tooltip}
        </div>
        <ColumnHeader
          names={columnNames}
          x0={current.x0}
          x1={current.x1}
          cellWidth={cellW}
          width={gridWidth}
          height={HEADER_HEIGHT}
          hoverCol={hover?.col ?? labelHover}
        />
      </div>
      <div className={css({ display: "flex" })} style={{ height: gridHeight }}>
        {showLabels && (
          <>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              <RowLabels
                rows={rows}
                rowHeight={cellH}
                offsetY={-current.y0 * cellH}
                width={panelSizes.labelWidth}
                height={gridHeight}
                hoverIndex={hover?.row ?? null}
                onHoverIndexChange={setLabelHover}
                onReorder={reorderableRows ? commitReorder : undefined}
                onReorderPreview={reorderableRows ? setPreview : undefined}
              />
            </div>
            <ResizeHandle
              orientation="vertical"
              size={panelSizes.labelWidth}
              onResize={(size) => setPanelSizes({ labelWidth: Math.round(size) })}
              min={LABEL_WIDTH_LIMITS.min}
              max={LABEL_WIDTH_LIMITS.max}
              thickness={DIVIDER_SIZE}
              aria-label="Resize labels"
            />
          </>
        )}
        <HeatmapCanvas
          matrix={matrix}
          order={renderedOrder}
          maxValue={maxValue}
          window={current}
          width={gridWidth}
          height={gridHeight}
          scheme={colorScheme}
          showNumbers={showNumbers}
          darkMode={darkMode}
          hover={hover ?? (hoverRow !== null ? { row: hoverRow, col: hoverRow } : null)}
          interaction={{
            ...dragHandlers,
            onPointerMove,
            onPointerLeave: () => updateHover(null),
            ref: wheel.ref,
          }}
        />
      </div>
    </div>
  );
}
