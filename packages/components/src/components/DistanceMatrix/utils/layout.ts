import { clampToExtent, limitZoomIn, type Viewport } from "@react-bio-viz/core";

import { DIVIDER_SIZE, HEADER_HEIGHT, MAX_CELL_SIZE } from "../constants";

export interface GridLayout {
  /** Width of the label column plus its divider; 0 without labels. */
  labelSpace: number;
  gridWidth: number;
  gridHeight: number;
}

/** Pixel sizes of the matrix's panels. `height` is a maximum: a small matrix takes only what its rows need. */
export function computeGridLayout(options: {
  count: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  labelWidth: number | null;
}): GridLayout {
  const { count, width, height, cellWidth, cellHeight, labelWidth } = options;
  const labelSpace = labelWidth === null ? 0 : labelWidth + DIVIDER_SIZE;
  return {
    labelSpace,
    gridWidth: Math.max(cellWidth, width - labelSpace),
    gridHeight: Math.max(cellHeight, Math.min(count * cellHeight, height - HEADER_HEIGHT)),
  };
}

/** The pannable extent in cells: the matrix, or the grid at the default cell size if that is larger. */
export function gridExtent(count: number, layout: GridLayout, cellWidth: number, cellHeight: number) {
  return {
    xMin: 0,
    xMax: Math.max(1, count, layout.gridWidth / cellWidth),
    yMin: 0,
    yMax: Math.max(1, count, layout.gridHeight / cellHeight),
  };
}

/** The top-left corner at the default cell size. */
export function defaultGridViewport(count: number, layout: GridLayout, cellWidth: number, cellHeight: number): Viewport {
  const extent = gridExtent(count, layout, cellWidth, cellHeight);
  return clampToExtent({ x0: 0, x1: layout.gridWidth / cellWidth, y0: 0, y1: layout.gridHeight / cellHeight, ...extent });
}

/** `factor`, limited so that neither axis zooms in past {@link MAX_CELL_SIZE}. */
export function limitGridZoom(factor: number, viewport: Viewport, layout: GridLayout): number {
  return Math.max(
    limitZoomIn(factor, viewport.x1 - viewport.x0, layout.gridWidth, MAX_CELL_SIZE),
    limitZoomIn(factor, viewport.y1 - viewport.y0, layout.gridHeight, MAX_CELL_SIZE)
  );
}
