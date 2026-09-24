import { useCallback, useLayoutEffect, useRef } from "react";

/** @public */
export interface UseWheelZoomOptions {
  /**
   * Called with the data-space point under the cursor and a zoom factor (`<1` zooms in). The
   * originating event is passed along so a component can pick axes from its modifier keys (e.g.
   * the MSA zooms columns only while Alt is held).
   */
  onZoom: (point: { x: number; y: number }, factor: number, event: WheelEvent) => void;
  /** Converts a pixel position (relative to the element the handler is attached to) to a data-space point. */
  toDataPoint: (pixelX: number, pixelY: number) => { x: number; y: number };
  /**
   * When provided, a plain wheel/trackpad scroll *pans* by the scroll delta (in pixels) and zooming
   * requires Ctrl/⌘ — which is also what a trackpad pinch reports — instead of every wheel tick
   * zooming. Suits surfaces that are mostly scrolled through (a long alignment or tree).
   */
  onPan?: (dxPixels: number, dyPixels: number) => void;
  /** Controls how much one wheel "tick" zooms by. Default 0.0015. */
  sensitivity?: number;
  disabled?: boolean;
}

/** @public */
export interface UseWheelZoomHandlers {
  /**
   * Callback ref: spread the handlers object (or pass this as `ref`) onto the interactive surface.
   * A ref rather than an `onWheel` prop because React registers wheel listeners as passive, where
   * `preventDefault()` is ignored and the page scrolls underneath the zoom.
   */
  ref: (element: Element | null) => void;
}

/** Wheel `deltaMode` is lines or pages on some mice; normalise to pixels. */
function deltaToPixels(delta: number, mode: number): number {
  if (mode === 1) return delta * 16;
  if (mode === 2) return delta * 400;
  return delta;
}

/**
 * @public
 * Wheel/trackpad-pinch-to-zoom, zooming around the pointer's position rather than the viewport
 * center — or, with `onPan`, scroll-to-pan plus Ctrl/⌘-scroll-to-zoom. Spread the returned object
 * onto the interactive surface; it attaches a native, non-passive listener so scrolling the surface
 * never also scrolls the page.
 */
export function useWheelZoom({
  onZoom,
  toDataPoint,
  onPan,
  sensitivity = 0.0015,
  disabled = false,
}: UseWheelZoomOptions): UseWheelZoomHandlers {
  // The listener is attached once per element; it reads the latest options through this ref so
  // re-renders (a new viewport, new callbacks) never have to detach and reattach it.
  const latest = useRef({ onZoom, toDataPoint, onPan, sensitivity, disabled });
  useLayoutEffect(() => {
    latest.current = { onZoom, toDataPoint, onPan, sensitivity, disabled };
  });

  const elementRef = useRef<Element | null>(null);

  const handleWheel = useCallback((event: Event) => {
    const wheel = event as WheelEvent;
    const options = latest.current;
    if (options.disabled) return;
    wheel.preventDefault();
    const dx = deltaToPixels(wheel.deltaX, wheel.deltaMode);
    const dy = deltaToPixels(wheel.deltaY, wheel.deltaMode);
    if (options.onPan && !(wheel.ctrlKey || wheel.metaKey)) {
      options.onPan(dx, dy);
      return;
    }
    const target = wheel.currentTarget as Element;
    const rect = target.getBoundingClientRect();
    const point = options.toDataPoint(wheel.clientX - rect.left, wheel.clientY - rect.top);
    options.onZoom(point, Math.exp(dy * options.sensitivity), wheel);
  }, []);

  const ref = useCallback(
    (element: Element | null) => {
      if (elementRef.current === element) return;
      elementRef.current?.removeEventListener("wheel", handleWheel);
      elementRef.current = element;
      element?.addEventListener("wheel", handleWheel, { passive: false });
    },
    [handleWheel]
  );

  return { ref };
}
