import { useEffect, useRef } from "react";
import { ACCENT_LITERAL, getDevicePixelRatio } from "@react-bio-viz/core";

import { DIAGONAL_COLOR, NUMBER_DECIMALS, NUMBER_MIN_CELL } from "../constants";
import type { DistanceColorScheme } from "../types";
import { contrastText, distanceColor } from "../utils/colors";

/**
 * The distance cells for the visible window. Only visible cells are drawn, so a matrix of any size
 * costs the same per frame; numbers appear once cells are large enough to hold them.
 */
export function HeatmapCanvas({
  matrix,
  order,
  maxValue,
  window,
  width,
  height,
  scheme,
  showNumbers,
  darkMode,
  hover,
  interaction,
}: {
  matrix: readonly (readonly number[])[];
  /** Display index → matrix index, for both rows and columns. */
  order: readonly number[];
  maxValue: number;
  window: { x0: number; x1: number; y0: number; y1: number };
  width: number;
  height: number;
  scheme: DistanceColorScheme;
  showNumbers: boolean;
  darkMode: boolean;
  hover: { row: number; col: number } | null;
  interaction?: React.HTMLAttributes<HTMLCanvasElement> & { ref?: (element: Element | null) => void };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: interactionRef, ...handlers } = interaction ?? {};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = getDevicePixelRatio();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const spanX = window.x1 - window.x0;
    const spanY = window.y1 - window.y0;
    if (spanX <= 0 || spanY <= 0) return;
    const cellW = width / spanX;
    const cellH = height / spanY;
    const n = order.length;
    const firstCol = Math.max(0, Math.floor(window.x0));
    const lastCol = Math.min(n, Math.ceil(window.x1));
    const firstRow = Math.max(0, Math.floor(window.y0));
    const lastRow = Math.min(n, Math.ceil(window.y1));
    const gap = cellW >= 6 && cellH >= 6 ? 1 : 0;
    const drawNumbers = showNumbers && cellW >= NUMBER_MIN_CELL.width && cellH >= NUMBER_MIN_CELL.height;
    if (drawNumbers) {
      ctx.font = `${Math.min(cellH * 0.55, cellW / 5.2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    }

    for (let row = firstRow; row < lastRow; row += 1) {
      const i = order[row];
      const y = (row - window.y0) * cellH;
      for (let col = firstCol; col < lastCol; col += 1) {
        const j = order[col];
        const x = (col - window.x0) * cellW;
        if (i === j) {
          ctx.fillStyle = darkMode ? DIAGONAL_COLOR.dark : DIAGONAL_COLOR.light;
          ctx.fillRect(x, y, cellW - gap, cellH - gap);
          if (drawNumbers) {
            ctx.fillStyle = darkMode ? "#888" : "#999";
            ctx.fillText("—", x + cellW / 2, y + cellH / 2);
          }
          continue;
        }
        const value = matrix[i]?.[j] ?? Number.NaN;
        const rgb = distanceColor(maxValue > 0 ? value / maxValue : 0, scheme);
        ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        ctx.fillRect(x, y, cellW - gap, cellH - gap);
        if (drawNumbers && Number.isFinite(value)) {
          ctx.fillStyle = contrastText(rgb);
          ctx.fillText(value.toFixed(NUMBER_DECIMALS), x + cellW / 2, y + cellH / 2);
        }
      }
    }

    if (hover) {
      const accent = darkMode ? ACCENT_LITERAL.dark : ACCENT_LITERAL.light;
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.12;
      ctx.fillRect((hover.col - window.x0) * cellW, 0, cellW, Math.min(height, (n - window.y0) * cellH));
      ctx.fillRect(0, (hover.row - window.y0) * cellH, Math.min(width, (n - window.x0) * cellW), cellH);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect((hover.col - window.x0) * cellW + 0.75, (hover.row - window.y0) * cellH + 0.75, cellW - 1.5, cellH - 1.5);
    }
  }, [matrix, order, maxValue, window.x0, window.x1, window.y0, window.y1, width, height, scheme, showNumbers, darkMode, hover]);

  return (
    <canvas
      ref={(element) => {
        canvasRef.current = element;
        interactionRef?.(element);
      }}
      style={{ width, height, touchAction: "none", cursor: "grab" }}
      {...handlers}
    />
  );
}
