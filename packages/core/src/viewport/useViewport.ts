import { useCallback } from "react";

import { useControllableState } from "../state/useControllableState";
import type { StoreController } from "../state/types";
import { fitToExtent, panBy, zoomAt, zoomBy, type Viewport } from "./Viewport";

/** @public */
export interface UseViewportOptions {
  /** The full extent of the data being viewed; used to compute the default/reset viewport. */
  extent: Pick<Viewport, "xMin" | "xMax" | "yMin" | "yMax">;
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (next: Viewport) => void;
  store?: StoreController<Viewport>;
}

/** @public */
export interface UseViewportResult {
  viewport: Viewport;
  setViewport: (next: Viewport | ((prev: Viewport) => Viewport)) => void;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  zoomAt: (point: { x: number; y: number }, factor: number) => void;
  reset: () => void;
}

/**
 * @public
 * The shared pan/zoom primitive for every component with a "large virtual coordinate space,
 * visible window" surface (MultipleSequenceAlignment, GeneModel, GenomeBrowser, and
 * BlastHitDistribution's query axis). Composes {@link useControllableState} with the pure
 * {@link Viewport} operations, so it supports controlled/uncontrolled/store-backed usage exactly
 * like every other stateful prop in this library — see the `bio-viz-conventions` project skill.
 */
export function useViewport(options: UseViewportOptions): UseViewportResult {
  const { extent, viewport, defaultViewport, onViewportChange, store } = options;

  const [value, setValue] = useControllableState<Viewport>({
    value: viewport,
    defaultValue: defaultViewport ?? fitToExtent(extent),
    onChange: onViewportChange,
    store,
  });

  const doPanBy = useCallback(
    (dx: number, dy: number) => setValue((prev) => panBy(prev, dx, dy)),
    [setValue]
  );
  const doZoomBy = useCallback(
    (factor: number) => setValue((prev) => zoomBy(prev, factor)),
    [setValue]
  );
  const doZoomAt = useCallback(
    (point: { x: number; y: number }, factor: number) => setValue((prev) => zoomAt(prev, point, factor)),
    [setValue]
  );
  const reset = useCallback(() => setValue(fitToExtent(extent)), [setValue, extent.xMin, extent.xMax, extent.yMin, extent.yMax]);

  return { viewport: value, setViewport: setValue, panBy: doPanBy, zoomBy: doZoomBy, zoomAt: doZoomAt, reset };
}
