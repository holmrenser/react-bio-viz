import { useMemo } from "react";
import { scaleLinear, type ScaleLinear } from "d3-scale";

import type { Viewport } from "../viewport/Viewport";

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
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
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
    const x = scaleLinear().domain([x0, x1]).range([0, width]);
    const y = scaleLinear().domain([y0, y1]).range(flipY ? [height, 0] : [0, height]);
    const devicePixelRatio =
      typeof window !== "undefined" && window.devicePixelRatio ? Math.max(1, window.devicePixelRatio) : 1;
    return { x, y, devicePixelRatio };
  }, [x0, x1, y0, y1, width, height, flipY]);
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
