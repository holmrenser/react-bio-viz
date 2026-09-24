import { useCallback, useRef, useState } from "react";

import { CLICK_THRESHOLD_PX } from "../constants";
import type { Marquee } from "../components/OverlayCanvas";
import { selectionModeFor, type SelectionMode } from "../utils/selection";

/** A cell in data coordinates: a column and a display row (after `rowOrder`). */
export interface GridCell {
  col: number;
  row: number;
}

/** A finished select gesture: the two corner cells, how to combine, and whether it was a click. */
export interface GridSelectGesture {
  from: GridCell;
  to: GridCell;
  mode: SelectionMode;
  isClick: boolean;
  shiftKey: boolean;
}

interface Gesture {
  kind: "pan" | "select";
  mode: SelectionMode;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

/**
 * Pointer handling for the alignment surface, deciding per press between panning and selecting:
 * a plain drag pans (in `"pan"` mode); a drag with Shift/Cmd/Ctrl — or any drag in `"select"`
 * mode — draws a marquee and selects on release; a press released without moving is a click-select.
 * The gesture lives in a ref (it changes every pixel and needs no render); only the marquee, which
 * is drawn, is state.
 */
export function useAlignmentGestures({
  interactionMode,
  toCell,
  panByPixels,
  onSelect,
  onHover,
  onPressStart,
}: {
  interactionMode: "pan" | "select";
  /** Local CSS-pixel position → cell, clamped into the grid. */
  toCell: (x: number, y: number) => GridCell;
  panByPixels: (dx: number, dy: number) => void;
  onSelect: (gesture: GridSelectGesture) => void;
  /** Pointer position over the surface (local and client coordinates), or `null` on leave. */
  onHover: (position: { x: number; y: number; clientX: number; clientY: number } | null) => void;
  onPressStart?: () => void;
}) {
  const gestureRef = useRef<Gesture | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  const local = (event: React.PointerEvent<Element>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = useCallback(
    (event: React.PointerEvent<Element>) => {
      if (event.button > 0) return;
      onPressStart?.();
      const { x, y } = local(event);
      const hasModifier = event.shiftKey || event.metaKey || event.ctrlKey;
      const kind = interactionMode === "select" || hasModifier ? "select" : "pan";
      gestureRef.current = {
        kind,
        mode: hasModifier ? selectionModeFor(event) : "replace",
        startX: x,
        startY: y,
        lastX: x,
        lastY: y,
        moved: false,
      };
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // ignore — the gesture still works while the pointer stays over the surface
      }
    },
    [interactionMode, onPressStart]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<Element>) => {
      const { x, y } = local(event);
      onHover({ x, y, clientX: event.clientX, clientY: event.clientY });
      const gesture = gestureRef.current;
      if (!gesture) return;
      if (!gesture.moved && Math.hypot(x - gesture.startX, y - gesture.startY) >= CLICK_THRESHOLD_PX) gesture.moved = true;
      if (gesture.kind === "pan") {
        panByPixels(gesture.lastX - x, gesture.lastY - y);
      } else if (gesture.moved) {
        setMarquee({ x0: gesture.startX, y0: gesture.startY, x1: x, y1: y });
      }
      gesture.lastX = x;
      gesture.lastY = y;
    },
    [onHover, panByPixels]
  );

  const finish = useCallback(
    (event: React.PointerEvent<Element>, cancelled: boolean) => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      setMarquee(null);
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        // ignore
      }
      if (!gesture || cancelled || gesture.kind !== "select") return;
      const { x, y } = local(event);
      onSelect({
        from: toCell(gesture.startX, gesture.startY),
        to: toCell(x, y),
        mode: gesture.mode,
        isClick: !gesture.moved,
        shiftKey: event.shiftKey,
      });
    },
    [onSelect, toCell]
  );

  return {
    marquee,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: React.PointerEvent<Element>) => finish(event, false),
      onPointerCancel: (event: React.PointerEvent<Element>) => finish(event, true),
      onPointerLeave: () => {
        if (!gestureRef.current) onHover(null);
      },
    },
  };
}
