import { useEffect, useRef } from "react";
import { setupCanvas } from "@react-bio-viz/core";

import { drawAlignment, type DrawAlignmentParams } from "../utils/drawAlignment";

export type AlignmentCanvasProps = Omit<DrawAlignmentParams, "devicePixelRatio"> & {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * One layer of alignment pixels — the main view, the consensus row or the minimap, which differ only
 * in `window` and size — redrawn from the visible window on every change (see `drawAlignment`).
 */
export function AlignmentCanvas({ className, style, ...params }: AlignmentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorIndex, rowOrder, sequences, window, width, height, showLetters, letterColor, reference } = params;
  // Depend on the window's numbers, not the object: callers build a fresh one every render.
  const { x0, x1, y0, y1 } = window;

  useEffect(() => {
    const frame = canvasRef.current && setupCanvas(canvasRef.current, width, height);
    if (!frame) return;
    const { ctx, dpr } = frame;
    drawAlignment(ctx, {
      colorIndex,
      rowOrder,
      sequences,
      window: { x0, x1, y0, y1 },
      width,
      height,
      devicePixelRatio: dpr,
      showLetters,
      letterColor,
      reference,
    });
  }, [
    colorIndex,
    rowOrder,
    sequences,
    x0,
    x1,
    y0,
    y1,
    width,
    height,
    showLetters,
    letterColor,
    reference,
  ]);

  return <canvas ref={canvasRef} className={className} style={{ width, height, ...style }} />;
}
