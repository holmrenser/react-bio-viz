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
 *
 * If the surface contains nested elements with their own click behavior (a feature marker with a
 * popover, say), mark them with `data-pan-ignore` so a click there opens the popover instead of
 * being captured as the start of a drag.
 */
export function useDragPan({ onPan, scaleX = 1, scaleY = 1, disabled = false }: UseDragPanOptions): UseDragPanHandlers {
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      if (disabled) return;
      // Skip starting a drag if the pointer went down on a descendant that opted out (e.g. a
      // feature with its own click/popover behavior) — otherwise capturing the pointer here
      // would swallow the click that descendant was expecting. Mark such elements with
      // `data-pan-ignore`.
      if ((event.target as Element | null)?.closest?.("[data-pan-ignore]")) return;
      draggingRef.current = { x: event.clientX, y: event.clientY };
      // Capture can throw (e.g. an already-released or synthetic pointer id); panning still
      // works without it, it just loses events if the pointer leaves the element.
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
