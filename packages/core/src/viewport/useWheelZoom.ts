import { useCallback, type WheelEvent as ReactWheelEvent } from "react";

/** @public */
export interface UseWheelZoomOptions {
  /** Called with the data-space point under the cursor and a zoom factor (`<1` zooms in). */
  onZoom: (point: { x: number; y: number }, factor: number) => void;
  /** Converts a pixel position (relative to the event's `currentTarget`) to a data-space point. */
  toDataPoint: (pixelX: number, pixelY: number) => { x: number; y: number };
  /** Controls how much one wheel "tick" zooms by. Default 0.0015. */
  sensitivity?: number;
  disabled?: boolean;
}

/** @public */
export interface UseWheelZoomHandlers {
  onWheel: (event: ReactWheelEvent) => void;
}

/**
 * @public
 * Wheel/trackpad-pinch-to-zoom, zooming around the pointer's position rather than the viewport
 * center. Spread the returned handler onto the interactive surface.
 */
export function useWheelZoom({
  onZoom,
  toDataPoint,
  sensitivity = 0.0015,
  disabled = false,
}: UseWheelZoomOptions): UseWheelZoomHandlers {
  const onWheel = useCallback(
    (event: ReactWheelEvent) => {
      if (disabled) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const point = toDataPoint(event.clientX - rect.left, event.clientY - rect.top);
      const factor = Math.exp(event.deltaY * sensitivity);
      onZoom(point, factor);
    },
    [onZoom, toDataPoint, sensitivity, disabled]
  );

  return { onWheel };
}
