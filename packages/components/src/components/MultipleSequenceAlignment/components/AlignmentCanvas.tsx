import { useEffect, useRef } from "react";
import { getDevicePixelRatio } from "@react-bio-viz/core";

import { drawAlignment, type DrawAlignmentParams } from "../utils/drawAlignment";

export type AlignmentCanvasProps = Omit<DrawAlignmentParams, "devicePixelRatio"> & {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * One layer of alignment pixels — the main view, the consensus row, or the minimap, which differ
 * only in `window` and size. Redraws the visible window directly on every change (see
 * `drawAlignment`) instead of cropping a pre-rendered bitmap, so letters are re-rasterised at the
 * current zoom and there is no size limit on the alignment.
 */
export function AlignmentCanvas({ className, style, ...params }: AlignmentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorIndex, rowOrder, sequences, window, width, height, showLetters, letterColor, reference } = params;
  // Depend on the window's numbers, not the object: callers build a fresh one every render.
  const { x0, x1, y0, y1 } = window;

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
