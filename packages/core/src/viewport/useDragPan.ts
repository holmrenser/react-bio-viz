import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/** @public */
export interface UseDragPanOptions {
  /** Called with the pan delta in data-space units (already sign-flipped: dragging content right pans the view left). */
  onPan: (dx: number, dy: number) => void;
  /** Data units per pixel along x. Default 1. */
  scaleX?: number;
  /** Data units per pixel along y. Default 1. */
  scaleY?: number;
  disabled?: boolean;
}

/** @public */
export interface UseDragPanHandlers {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
  onPointerCancel: (event: ReactPointerEvent) => void;
}

/**
 * @public
 * Pointer-event drag-to-pan, generic over any element with a pixel-to-data-unit scale. Spread the
 * returned handlers onto the interactive surface (an `<svg>`, a `<canvas>`, a wrapper `<div>`).
 */
export function useDragPan({ onPan, scaleX = 1, scaleY = 1, disabled = false }: UseDragPanOptions): UseDragPanHandlers {
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (disabled) return;
      draggingRef.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [disabled]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!draggingRef.current) return;
      const dxPx = event.clientX - draggingRef.current.x;
      const dyPx = event.clientY - draggingRef.current.y;
      draggingRef.current = { x: event.clientX, y: event.clientY };
      onPan(-dxPx * scaleX, -dyPx * scaleY);
    },
    [onPan, scaleX, scaleY]
  );

  const onPointerUp = useCallback((event: ReactPointerEvent) => {
    draggingRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
