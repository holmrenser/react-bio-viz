/**
 * @public
 * A plain, serializable "virtual coordinate space + visible window" shape shared by every
 * component that needs pan/zoom (MSA, GeneModel, GenomeBrowser, BlastHitDistribution's axis).
 * Deliberately plain data, not a class with mutation methods, so it survives living in a Zustand
 * store, being sent over an anywidget/Jupyter comm channel as JSON, or being diffed by React.
 */
export interface Viewport {
  /** Left edge of the visible window, in data coordinates. */
  x0: number;
  /** Right edge of the visible window, in data coordinates. */
  x1: number;
  /** Top edge of the visible window, in data coordinates. */
  y0: number;
  /** Bottom edge of the visible window, in data coordinates. */
  y1: number;
  /** Left bound of the full data extent. */
  xMin: number;
  /** Right bound of the full data extent. */
  xMax: number;
  /** Top bound of the full data extent. */
  yMin: number;
  /** Bottom bound of the full data extent. */
  yMax: number;
}

/** @public Minimum visible span (in either axis) that zooming in is allowed to reach. */
export const MIN_VIEWPORT_SPAN = 1e-6;

/**
 * @public
 * A viewport that shows the full extent of `[xMin,xMax] x [yMin,yMax]`, i.e. fully zoomed out.
 */
export function fitToExtent(extent: Pick<Viewport, "xMin" | "xMax" | "yMin" | "yMax">): Viewport {
  return { x0: extent.xMin, x1: extent.xMax, y0: extent.yMin, y1: extent.yMax, ...extent };
}

function clampSpan(lo: number, hi: number, boundLo: number, boundHi: number): [number, number] {
  const extent = boundHi - boundLo;
  let span = hi - lo;
  if (span <= 0) span = MIN_VIEWPORT_SPAN;
  if (span > extent) span = extent;

  let nextLo = lo;
  let nextHi = lo + span;
  if (nextLo < boundLo) {
    nextLo = boundLo;
    nextHi = boundLo + span;
  }
  if (nextHi > boundHi) {
    nextHi = boundHi;
    nextLo = boundHi - span;
  }
  return [nextLo, nextHi];
}

/**
 * @public
 * Clamps a viewport's visible window so it never extends past its own data extent and never
 * collapses to (or past) zero width/height.
 */
export function clampToExtent(viewport: Viewport): Viewport {
  const [x0, x1] = clampSpan(viewport.x0, viewport.x1, viewport.xMin, viewport.xMax);
  const [y0, y1] = clampSpan(viewport.y0, viewport.y1, viewport.yMin, viewport.yMax);
  return { ...viewport, x0, x1, y0, y1 };
}

/**
 * @public
 * Shifts the visible window by `dx`/`dy` data units (positive = pan right/down), clamped to stay
 * within the data extent.
 */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return clampToExtent({
    ...viewport,
    x0: viewport.x0 + dx,
    x1: viewport.x1 + dx,
    y0: viewport.y0 + dy,
    y1: viewport.y1 + dy,
  });
}

/**
 * @public
 * Scales the visible window by `factor` (`<1` zooms in, `>1` zooms out) around its own center.
 */
export function zoomBy(viewport: Viewport, factor: number): Viewport {
  const cx = (viewport.x0 + viewport.x1) / 2;
  const cy = (viewport.y0 + viewport.y1) / 2;
  return zoomAt(viewport, { x: cx, y: cy }, factor);
}

/**
 * @public
 * Scales the visible window by `factor` around a fixed data-coordinate point (so that point stays
 * under the cursor), clamped to the data extent. `factor < 1` zooms in, `factor > 1` zooms out.
 */
export function zoomAt(viewport: Viewport, point: { x: number; y: number }, factor: number): Viewport {
  const halfWidth = ((viewport.x1 - viewport.x0) * factor) / 2;
  const halfHeight = ((viewport.y1 - viewport.y0) * factor) / 2;
  const xRatio = (point.x - viewport.x0) / (viewport.x1 - viewport.x0 || 1);
  const yRatio = (point.y - viewport.y0) / (viewport.y1 - viewport.y0 || 1);

  return clampToExtent({
    ...viewport,
    x0: point.x - 2 * halfWidth * xRatio,
    x1: point.x + 2 * halfWidth * (1 - xRatio),
    y0: point.y - 2 * halfHeight * yRatio,
    y1: point.y + 2 * halfHeight * (1 - yRatio),
  });
}
