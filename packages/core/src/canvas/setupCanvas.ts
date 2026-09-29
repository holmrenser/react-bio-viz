/**
 * @public
 * `window.devicePixelRatio`, at least 1 (and 1 outside the browser).
 */
export function getDevicePixelRatio(): number {
  return typeof window !== "undefined" && window.devicePixelRatio ? Math.max(1, window.devicePixelRatio) : 1;
}

/**
 * @public
 * Readies a `<canvas>` for a frame: sizes its backing store for the display's pixel ratio (so it
 * stays sharp on HiDPI screens), then clears it and scales its context so drawing code works in
 * CSS pixels. Returns `null` when no 2D context is available.
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): { ctx: CanvasRenderingContext2D; dpr: number } | null {
  const dpr = getDevicePixelRatio();
  const deviceWidth = Math.max(1, Math.round(width * dpr));
  const deviceHeight = Math.max(1, Math.round(height * dpr));
  // Assigning a dimension reallocates the backing store, so only do it when it changes.
  if (canvas.width !== deviceWidth) canvas.width = deviceWidth;
  if (canvas.height !== deviceHeight) canvas.height = deviceHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, dpr };
}
