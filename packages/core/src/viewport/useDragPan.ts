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
 * Drag-to-pan for any surface with a pixel-to-data-unit scale: spread the handlers onto it. Mark
 * nested elements with their own click behaviour `data-pan-ignore`, so a press there stays a click.
 */
export function useDragPan({ onPan, scaleX = 1, scaleY = 1, disabled = false }: UseDragPanOptions): UseDragPanHandlers {
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (disabled) return;
      // Capturing the pointer would swallow the click an opted-out descendant expects.
      if ((event.target as Element | null)?.closest?.("[data-pan-ignore]")) return;
      draggingRef.current = { x: event.clientX, y: event.clientY };
      // Capture can throw (a released or synthetic pointer id); panning works without it.
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // ignore
      }
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
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
