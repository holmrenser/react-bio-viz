import { useEffect, useRef } from "react";
import { css, cx } from "@emotion/css";
import { configureCanvasForDevicePixelRatio, getDevicePixelRatio } from "@react-bio-viz/core";

/** The crop window to draw from the offscreen canvas, in column/row (data) units. */
export interface AlignmentCanvasWindow {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface AlignmentCanvasInteractionHandlers {
  onPointerDown?: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerMove?: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerUp?: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLCanvasElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLCanvasElement>;
  onWheel?: React.WheelEventHandler<HTMLCanvasElement>;
}

/**
 * Crops and scales a region of the offscreen full-resolution canvas into a right-sized,
 * HiDPI-sharp on-screen canvas. Used for the main alignment view, the consensus row, and the
 * minimap — the only thing that differs between them is `sourceWindow` and whether interaction
 * handlers are attached.
 */
export function AlignmentCanvas({
  offscreenCanvasRef,
  sourceWindow,
  sourceRevision,
  cellSize,
  pixelWidth,
  pixelHeight,
  interaction,
  className,
}: {
  offscreenCanvasRef: React.RefObject<HTMLCanvasElement>;
  sourceWindow: AlignmentCanvasWindow;
  /**
   * An opaque value whose identity changes whenever the offscreen canvas is repainted (color
   * style, dark mode, highlight, the alignment itself). The crop below copies *pixels*, and a ref
   * to a canvas gives React nothing to diff, so without this the on-screen view keeps showing a
   * stale image after a repaint that didn't also move the viewport — e.g. toggling dark mode.
   *
   * Sibling effects run in JSX order, and the `OffscreenCanvas` elements are rendered before every
   * `AlignmentCanvas`, so by the time this effect re-runs the source is already up to date.
   */
  sourceRevision?: unknown;
  cellSize: number;
  pixelWidth: number;
  pixelHeight: number;
  interaction?: AlignmentCanvasInteractionHandlers;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = offscreenCanvasRef.current;
    if (!canvas || !source) return;
    const devicePixelRatio = getDevicePixelRatio();
    const context = configureCanvasForDevicePixelRatio(canvas, pixelWidth, pixelHeight, devicePixelRatio);
    if (!context) return;

    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.drawImage(
      source,
      sourceWindow.x0 * cellSize,
      sourceWindow.y0 * cellSize,
      (sourceWindow.x1 - sourceWindow.x0) * cellSize,
      (sourceWindow.y1 - sourceWindow.y0) * cellSize,
      0,
      0,
      pixelWidth,
      pixelHeight
    );
  }, [
    offscreenCanvasRef,
    sourceRevision,
    sourceWindow.x0,
    sourceWindow.x1,
    sourceWindow.y0,
    sourceWindow.y1,
    cellSize,
    pixelWidth,
    pixelHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={cx(css({ touchAction: "none" }), className)}
      style={{ width: pixelWidth, height: pixelHeight }}
      {...interaction}
    />
  );
}
