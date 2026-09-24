import { useEffect, useRef } from "react";
import { ACCENT_LITERAL, getDevicePixelRatio, SELECTION_LITERAL } from "@react-bio-viz/core";

import type { AlignmentWindow } from "../utils/drawAlignment";

/** A marquee being dragged out, in CSS pixels relative to the canvas. */
export interface Marquee {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * The transparent layer above the alignment pixels: hover cross-hair bands, the selection, and the
 * marquee of an in-progress drag-select. Kept separate so moving the pointer never repaints the
 * (much more expensive) residue layer underneath.
 */
export function OverlayCanvas({
  window,
  width,
  height,
  hoverRow,
  hoverCol,
  selectedDisplayRows,
  selectedColumns,
  marquee,
  darkMode,
  interaction,
}: {
  window: AlignmentWindow;
  width: number;
  height: number;
  hoverRow: number | null;
  hoverCol: number | null;
  selectedDisplayRows: readonly number[];
  selectedColumns: readonly number[];
  marquee: Marquee | null;
  darkMode: boolean;
  interaction?: React.HTMLAttributes<HTMLCanvasElement> & { ref?: (element: Element | null) => void };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: interactionRef, style: interactionStyle, ...handlers } = interaction ?? {};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = getDevicePixelRatio();
    const deviceWidth = Math.max(1, Math.round(width * dpr));
    const deviceHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== deviceWidth) canvas.width = deviceWidth;
    if (canvas.height !== deviceHeight) canvas.height = deviceHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const spanX = window.x1 - window.x0;
    const spanY = window.y1 - window.y0;
    if (spanX <= 0 || spanY <= 0) return;
    const cellW = width / spanX;
    const cellH = height / spanY;
    const colX = (col: number) => (col - window.x0) * cellW;
    const rowY = (row: number) => (row - window.y0) * cellH;
    const visibleCol = (col: number) => col + 1 > window.x0 && col < window.x1;
    const visibleRow = (row: number) => row + 1 > window.y0 && row < window.y1;

    ctx.fillStyle = SELECTION_LITERAL.fill;
    ctx.strokeStyle = SELECTION_LITERAL.stroke;
    ctx.lineWidth = 1;
    for (const col of selectedColumns) {
      if (!visibleCol(col)) continue;
      ctx.fillRect(colX(col), 0, cellW, height);
      if (cellW >= 3) ctx.strokeRect(colX(col) + 0.5, 0.5, cellW - 1, height - 1);
    }
    for (const row of selectedDisplayRows) {
      if (!visibleRow(row)) continue;
      ctx.fillRect(0, rowY(row), width, cellH);
      if (cellH >= 3) ctx.strokeRect(0.5, rowY(row) + 0.5, width - 1, cellH - 1);
    }

    const accent = darkMode ? ACCENT_LITERAL.dark : ACCENT_LITERAL.light;
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.12;
    if (hoverCol !== null && visibleCol(hoverCol)) ctx.fillRect(colX(hoverCol), 0, Math.max(1, cellW), height);
    if (hoverRow !== null && visibleRow(hoverRow)) ctx.fillRect(0, rowY(hoverRow), width, Math.max(1, cellH));
    ctx.globalAlpha = 1;
    if (hoverCol !== null && hoverRow !== null && visibleCol(hoverCol) && visibleRow(hoverRow) && cellW >= 3 && cellH >= 3) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(colX(hoverCol) + 0.75, rowY(hoverRow) + 0.75, cellW - 1.5, cellH - 1.5);
    }

    if (marquee) {
      const x = Math.min(marquee.x0, marquee.x1);
      const y = Math.min(marquee.y0, marquee.y1);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = SELECTION_LITERAL.stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.abs(marquee.x1 - marquee.x0), Math.abs(marquee.y1 - marquee.y0));
      ctx.setLineDash([]);
    }
  }, [window.x0, window.x1, window.y0, window.y1, width, height, hoverRow, hoverCol, selectedDisplayRows, selectedColumns, marquee, darkMode]);

  return (
    <canvas
      ref={(element) => {
        canvasRef.current = element;
        interactionRef?.(element);
      }}
      style={{ ...interactionStyle, position: "absolute", inset: 0, width, height, touchAction: "none" }}
      {...handlers}
    />
  );
}
