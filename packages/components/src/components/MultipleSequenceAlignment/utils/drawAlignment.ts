import { toRGBA } from "@react-bio-viz/core";

import {
  CELL_FILL_RATIO,
  CELL_GAP_MIN_SIZE,
  LETTER_MIN_CELL_HEIGHT,
  LETTER_MIN_CELL_WIDTH,
  PIXEL_MODE_MAX_CELL_SIZE,
} from "../constants";
import type { ColorIndex } from "./colorIndex";

/** A window onto the alignment in data units: columns across, display rows down. */
export interface AlignmentWindow {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface DrawAlignmentParams {
  colorIndex: ColorIndex;
  /** Display row → row of `colorIndex` (i.e. `msa` index). */
  rowOrder: readonly number[];
  /** Residues, in `colorIndex` row order; only read when letters are drawn. */
  sequences: readonly string[];
  window: AlignmentWindow;
  /** CSS-pixel size of the target. */
  width: number;
  height: number;
  devicePixelRatio: number;
  showLetters: boolean;
  letterColor: string;
  /** When set, a residue equal to this sequence's residue at its column is drawn as `·`. */
  reference?: string;
}

/**
 * Paints the visible part of an alignment. Chooses per frame between two strategies so cost is
 * bounded by screen size, not alignment size:
 *
 * - cells ≥ {@link PIXEL_MODE_MAX_CELL_SIZE}px: `fillRect` per cell (runs of equal colour merged
 *   while cells are too small to show a gap), letters drawn at the current zoom so they stay crisp;
 * - smaller: one `ImageData` pass, sampling the cell under each device pixel's centre.
 */
export function drawAlignment(ctx: CanvasRenderingContext2D, params: DrawAlignmentParams): void {
  const { window, width, height, devicePixelRatio: dpr } = params;
  const spanX = window.x1 - window.x0;
  const spanY = window.y1 - window.y0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (spanX <= 0 || spanY <= 0 || params.colorIndex.cols === 0 || params.rowOrder.length === 0) return;

  const cellW = width / spanX;
  const cellH = height / spanY;
  if (cellW < PIXEL_MODE_MAX_CELL_SIZE || cellH < PIXEL_MODE_MAX_CELL_SIZE) {
    drawPixels(ctx, params, cellW, cellH);
  } else {
    drawCells(ctx, params, cellW, cellH);
  }
}

function drawCells(ctx: CanvasRenderingContext2D, params: DrawAlignmentParams, cellW: number, cellH: number): void {
  const { colorIndex, rowOrder, window, sequences, showLetters, letterColor, reference } = params;
  const { cols, indices, palette } = colorIndex;
  const firstCol = Math.max(0, Math.floor(window.x0));
  const lastCol = Math.min(cols, Math.ceil(window.x1));
  const firstRow = Math.max(0, Math.floor(window.y0));
  const lastRow = Math.min(rowOrder.length, Math.ceil(window.y1));
  const withGaps = cellW >= CELL_GAP_MIN_SIZE && cellH >= CELL_GAP_MIN_SIZE;
  const fillW = withGaps ? cellW * CELL_FILL_RATIO : cellW;
  const fillH = withGaps ? cellH * CELL_FILL_RATIO : cellH;

  for (let displayRow = firstRow; displayRow < lastRow; displayRow += 1) {
    const offset = rowOrder[displayRow] * cols;
    const y = (displayRow - window.y0) * cellH;
    let col = firstCol;
    while (col < lastCol) {
      const index = indices[offset + col];
      let run = 1;
      // Merge equal neighbours into one rect while there are no visible gaps to preserve — at a
      // few pixels per cell this cuts fill calls by an order of magnitude on conserved regions.
      if (!withGaps) while (col + run < lastCol && indices[offset + col + run] === index) run += 1;
      ctx.fillStyle = palette[index];
      ctx.fillRect((col - window.x0) * cellW, y, withGaps ? fillW : cellW * run, fillH);
      col += run;
    }
  }

  if (!showLetters || cellW < LETTER_MIN_CELL_WIDTH || cellH < LETTER_MIN_CELL_HEIGHT) return;
  ctx.fillStyle = letterColor;
  ctx.font = `${Math.min(cellH * 0.75, cellW * 1.1)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let displayRow = firstRow; displayRow < lastRow; displayRow += 1) {
    const sequence = sequences[rowOrder[displayRow]];
    const y = (displayRow - window.y0) * cellH + fillH / 2;
    for (let col = firstCol; col < lastCol; col += 1) {
      const char = sequence[col];
      if (char === undefined) continue;
      const shown = reference !== undefined && reference[col] === char ? "·" : char;
      ctx.fillText(shown, (col - window.x0) * cellW + fillW / 2, y);
    }
  }
}

function drawPixels(ctx: CanvasRenderingContext2D, params: DrawAlignmentParams, cellW: number, cellH: number): void {
  const { colorIndex, rowOrder, window, width, height, devicePixelRatio: dpr } = params;
  const { cols, indices, palette } = colorIndex;
  const deviceW = Math.max(1, Math.round(width * dpr));
  const deviceH = Math.max(1, Math.round(height * dpr));
  const image = ctx.createImageData(deviceW, deviceH);
  const data = image.data;

  const rgba = new Uint8ClampedArray(palette.length * 4);
  palette.forEach((color, i) => rgba.set(toRGBA(color), i * 4));

  // Which cell each device-pixel column/row samples, computed once per frame.
  const colAt = new Int32Array(deviceW);
  for (let px = 0; px < deviceW; px += 1) {
    const col = Math.floor(window.x0 + (px + 0.5) / dpr / cellW);
    colAt[px] = col >= 0 && col < cols ? col : -1;
  }
  const offsetAt = new Int32Array(deviceH);
  for (let py = 0; py < deviceH; py += 1) {
    const displayRow = Math.floor(window.y0 + (py + 0.5) / dpr / cellH);
    offsetAt[py] = displayRow >= 0 && displayRow < rowOrder.length ? rowOrder[displayRow] * cols : -1;
  }

  for (let py = 0; py < deviceH; py += 1) {
    const offset = offsetAt[py];
    if (offset < 0) continue;
    let out = py * deviceW * 4;
    for (let px = 0; px < deviceW; px += 1, out += 4) {
      const col = colAt[px];
      if (col < 0) continue;
      const src = indices[offset + col] * 4;
      data[out] = rgba[src];
      data[out + 1] = rgba[src + 1];
      data[out + 2] = rgba[src + 2];
      data[out + 3] = rgba[src + 3];
    }
  }
  ctx.putImageData(image, 0, 0);
}
