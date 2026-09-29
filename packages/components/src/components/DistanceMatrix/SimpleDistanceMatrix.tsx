import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampToExtent,
  limitZoomIn,
  moveItem,
  ResizeHandle,
  resolveRowOrder,
  ROOT_CLASS,
  RowLabels,
  useDarkMode,
  useDragPan,
  useViewport,
  useWheelZoom,
  type RowReorderPreview,
} from "@react-bio-viz/core";

import { ColumnHeader } from "./components/ColumnHeader";
import { HeatmapCanvas } from "./components/HeatmapCanvas";
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  DEFAULT_PANEL_SIZES,
  DIVIDER_SIZE,
  HEADER_HEIGHT,
  LABEL_WIDTH_LIMITS,
  MAX_CELL_SIZE,
  NO_ORDER,
  NUMBER_DECIMALS,
} from "./constants";
import type { DistanceMatrixHover, SimpleDistanceMatrixProps } from "./types";
import { maxDistance } from "./utils/colors";
import { computeGridLayout, defaultGridViewport, gridExtent } from "./utils/layout";

/**
 * @public
 * @group Components
 * The heatmap inside {@link DistanceMatrix}, without its toolbar, and controlled: pan/zoom, row
 * drags and panel resizes report through `onViewportChange`, `onRowOrderChange` and
 * `onPanelSizesChange`, and show once passed back.
 */
export function SimpleDistanceMatrix({
  labels,
  matrix,
  labelNames,
  width = 650,
  height = 500,
  options,
  viewport,
  onViewportChange,
  rowOrder = NO_ORDER,
  onRowOrderChange,
  panelSizes = DEFAULT_PANEL_SIZES,
  onPanelSizesChange,
  onHoverChange,
}: SimpleDistanceMatrixProps): React.JSX.Element {
  const systemDarkMode = useDarkMode();
  const {
    showNumbers = true,
    colorScheme = "warm",
    cellWidth = CELL_WIDTH,
    cellHeight = CELL_HEIGHT,
    showLabels = true,
    reorderableRows = true,
    darkMode = systemDarkMode,
  } = options ?? {};

  const n = labels.length;
  const order = useMemo(() => resolveRowOrder(labels, rowOrder), [labels, rowOrder]);
  const [preview, setPreview] = useState<RowReorderPreview | null>(null);
  const renderedOrder = useMemo(() => (preview ? moveItem(order, preview.from, preview.to) : order), [order, preview]);
  const nameOf = useCallback((id: string) => labelNames?.[id] ?? id, [labelNames]);
  const maxValue = useMemo(() => maxDistance(matrix), [matrix]);

  const layout = useMemo(
    () =>
      computeGridLayout({ count: n, width, height, cellWidth, cellHeight, labelWidth: showLabels ? panelSizes.labelWidth : null }),
    [n, width, height, cellWidth, cellHeight, showLabels, panelSizes.labelWidth]
  );
  const { labelSpace, gridWidth, gridHeight } = layout;
  const extent = useMemo(() => gridExtent(n, layout, cellWidth, cellHeight), [n, layout, cellWidth, cellHeight]);
  const current = useMemo(
    () => viewport ?? defaultGridViewport(n, layout, cellWidth, cellHeight),
    [viewport, n, layout, cellWidth, cellHeight]
  );
  const { setViewport, panBy, zoomAt } = useViewport({ extent, viewport: current, onViewportChange });

  // The matrix changed size: keep the window inside it.
  useEffect(() => {
    if (current.xMax !== extent.xMax || current.yMax !== extent.yMax) setViewport((prev) => clampToExtent({ ...prev, ...extent }));
  }, [extent, current.xMax, current.yMax, setViewport]);

  const spanX = current.x1 - current.x0;
  const spanY = current.y1 - current.y0;
  const cellW = gridWidth / spanX;
  const cellH = gridHeight / spanY;

  const dragHandlers = useDragPan({ onPan: (dx, dy) => panBy(dx, dy), scaleX: 1 / cellW, scaleY: 1 / cellH });
  const wheel = useWheelZoom({
    onPan: (dx, dy) => panBy(dx / cellW, dy / cellH),
    onZoom: (point, factor) =>
      zoomAt(
        point,
        limitZoomIn(factor, spanX, gridWidth, MAX_CELL_SIZE),
        limitZoomIn(factor, spanY, gridHeight, MAX_CELL_SIZE)
      ),
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
    (from: number, to: number) => onRowOrderChange?.(moveItem(order.map((index) => labels[index]), from, to)),
    [order, labels, onRowOrderChange]
  );

  const hoverRow = hover?.row ?? labelHover;
  const tooltip =
    hover && renderedOrder[hover.row] !== renderedOrder[hover.col]
      ? `${nameOf(labels[renderedOrder[hover.row]])} × ${nameOf(labels[renderedOrder[hover.col]])}: ${(
          matrix[renderedOrder[hover.row]]?.[renderedOrder[hover.col]] ?? Number.NaN
        ).toFixed(NUMBER_DECIMALS)}`
      : null;

  return (
    <div className={`${ROOT_CLASS} flex flex-col text-foreground`} style={{ width }}>
      <div className="flex">
        <div
          className="flex shrink-0 items-end overflow-hidden px-1 text-xs text-muted-foreground"
          style={{ width: labelSpace, height: HEADER_HEIGHT }}
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
      <div className="flex" style={{ height: gridHeight }}>
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
              onResize={(size) => onPanelSizesChange?.({ ...panelSizes, labelWidth: Math.round(size) })}
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
