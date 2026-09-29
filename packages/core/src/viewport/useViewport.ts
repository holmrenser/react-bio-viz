import { useCallback } from "react";

import { useControllableState } from "../state/useControllableState";
import type { SetValue, StoreController } from "../state/types";
import { fitToExtent, panBy, zoomAt, zoomBy, type Viewport } from "./Viewport";

/** @public */
export interface UseViewportOptions {
  /** The full extent of the data; the default viewport and `reset` fit it. */
  extent: Pick<Viewport, "xMin" | "xMax" | "yMin" | "yMax">;
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (next: Viewport) => void;
  viewportStore?: StoreController<Viewport>;
}

/** @public */
export interface UseViewportResult {
  viewport: Viewport;
  setViewport: SetValue<Viewport>;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  zoomAt: (point: { x: number; y: number }, factor: number, factorY?: number) => void;
  reset: () => void;
}

/**
 * @public
 * Controllable pan/zoom state: {@link useControllableState} over a {@link Viewport}, plus the pure
 * viewport operations bound to it.
 */
export function useViewport(options: UseViewportOptions): UseViewportResult {
  const { extent, viewport, defaultViewport, onViewportChange, viewportStore } = options;

  const [value, setValue] = useControllableState<Viewport>({
    value: viewport,
    defaultValue: defaultViewport ?? fitToExtent(extent),
    onChange: onViewportChange,
    store: viewportStore,
  });

  const doPanBy = useCallback((dx: number, dy: number) => setValue((prev) => panBy(prev, dx, dy)), [setValue]);
  const doZoomBy = useCallback((factor: number) => setValue((prev) => zoomBy(prev, factor)), [setValue]);
  const doZoomAt = useCallback(
    (point: { x: number; y: number }, factor: number, factorY?: number) =>
      setValue((prev) => zoomAt(prev, point, factor, factorY)),
    [setValue]
  );
  const { xMin, xMax, yMin, yMax } = extent;
  const reset = useCallback(() => setValue(fitToExtent({ xMin, xMax, yMin, yMax })), [setValue, xMin, xMax, yMin, yMax]);

  return { viewport: value, setViewport: setValue, panBy: doPanBy, zoomBy: doZoomBy, zoomAt: doZoomAt, reset };
}
