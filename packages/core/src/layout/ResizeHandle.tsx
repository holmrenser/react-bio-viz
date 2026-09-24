import { useCallback, useRef } from "react";

import { cn } from "../lib/utils";

/** @public */
export interface ResizeHandleProps {
  /** `"vertical"` is a column divider dragged left/right; `"horizontal"` a row divider dragged up/down. */
  orientation: "vertical" | "horizontal";
  /** The size being resized, at the moment a drag starts. */
  size: number;
  /** Called with the new size on every pointer move of a drag, already clamped to `[min, max]`. */
  onResize: (size: number) => void;
  min?: number;
  max?: number;
  /** Hit-area thickness in pixels; the visible line stays 1px. @defaultValue 8 */
  thickness?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * @public
 * A draggable divider between two panels (an MSA's label column and its canvas, a track and the
 * alignment above it). Deliberately stateless: it reports sizes and the owning component decides
 * where they live — which, per the controllable-state convention, is usually a `panelSizes` prop.
 */
export function ResizeHandle({
  orientation,
  size,
  onResize,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  thickness = 8,
  className,
  "aria-label": ariaLabel,
}: ResizeHandleProps) {
  const dragRef = useRef<{ start: number; startSize: number } | null>(null);
  const isVertical = orientation === "vertical";

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = { start: isVertical ? event.clientX : event.clientY, startSize: size };
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // ignore — resizing still works while the pointer stays over the handle
      }
    },
    [isVertical, size]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = (isVertical ? event.clientX : event.clientY) - drag.start;
      onResize(Math.max(min, Math.min(max, drag.startSize + delta)));
    },
    [isVertical, min, max, onResize]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      data-pan-ignore
      className={cn("group flex shrink-0 touch-none justify-center", isVertical ? "flex-row" : "flex-col", className)}
      style={{
        [isVertical ? "width" : "height"]: thickness,
        cursor: isVertical ? "col-resize" : "row-resize",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className={cn("bg-border transition-colors group-hover:bg-(--rbv-accent)", isVertical ? "w-px self-stretch" : "h-px w-full")}
      />
    </div>
  );
}
