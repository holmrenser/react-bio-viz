import { useMemo } from "react";

import type { Viewport } from "../viewport/Viewport";
import { createLinearScale, type LinearScale } from "./linearScale";

/** @public */
export interface UseCoordinateScaleOptions {
  /** Data-space visible window; only `x0/x1/y0/y1` are used. */
  viewport: Pick<Viewport, "x0" | "x1" | "y0" | "y1">;
  /** Pixel width of the render target. */
  width: number;
  /** Pixel height of the render target. */
  height: number;
  /** Flip the y range so `y0` maps to `height` instead of `0`. Default `false`. */
  flipY?: boolean;
}

/** @public */
export interface CoordinateScale {
  x: LinearScale;
  y: LinearScale;
  /** `window.devicePixelRatio`, clamped to a minimum of 1 (and 1 outside the browser). */
  devicePixelRatio: number;
}

/**
 * @public
 * One shared way to turn a {@link Viewport} into pixel-space scales, so SVG renderers (GeneModel,
 * PhyloTree) and Canvas renderers (MultipleSequenceAlignment) derive their coordinates from the
 * same source instead of each hand-rolling `d3.scaleLinear().domain().range()` slightly
 * differently.
 */
export function useCoordinateScale(options: UseCoordinateScaleOptions): CoordinateScale {
  const { viewport, width, height, flipY = false } = options;
  const { x0, x1, y0, y1 } = viewport;

  return useMemo(() => {
    const x = createLinearScale([x0, x1], [0, width]);
    const y = createLinearScale([y0, y1], flipY ? [height, 0] : [0, height]);
    return { x, y, devicePixelRatio: getDevicePixelRatio() };
  }, [x0, x1, y0, y1, width, height, flipY]);
}

/**
 * @public
 * `window.devicePixelRatio`, clamped to a minimum of 1 (and 1 outside the browser). Useful on its
 * own when a component needs HiDPI-aware canvas sizing without the rest of {@link useCoordinateScale}.
 */
export function getDevicePixelRatio(): number {
  return typeof window !== "undefined" && window.devicePixelRatio ? Math.max(1, window.devicePixelRatio) : 1;
}

/**
 * @public
 * Sizes a `<canvas>` element's backing store for `devicePixelRatio` (so it isn't blurry on HiDPI
 * screens) while keeping its CSS/layout size at `cssWidth`x`cssHeight`, and returns a 2D context
 * pre-scaled so drawing code can keep working in CSS pixels.
 */
export function configureCanvasForDevicePixelRatio(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number
): CanvasRenderingContext2D | null {
  canvas.width = Math.round(cssWidth * devicePixelRatio);
  canvas.height = Math.round(cssHeight * devicePixelRatio);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  return ctx;
}
