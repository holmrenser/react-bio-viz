import { useCallback, useRef, useState } from "react";
import { css } from "@emotion/css";
import { clampToExtent, type Viewport } from "@react-bio-viz/core";

import { MINIMAP_EDGE_ZONE } from "../constants";
import type { ColorIndex } from "../utils/colorIndex";
import { AlignmentCanvas } from "./AlignmentCanvas";

type DragMode = "pan" | "resize-left" | "resize-right";

const FULL_WINDOW = (columns: number, rows: number) => ({ x0: 0, x1: columns, y0: 0, y1: rows });

/**
 * An interactive overview of the whole alignment: the current viewport is drawn as a box over a
 * fully-zoomed-out render. Clicking outside the box jumps the main view there; dragging inside it
 * pans; dragging near its left/right edge resizes it (zooms). Mirrors acacia's minimap, which is
 * the same canvas pipeline as the main view rather than a separate implementation — see the
 * `bio-viz-conventions` skill for why viewport interactions all go through the same `useViewport`
 * seam regardless of which surface triggers them.
 *
 * The overview is drawn by the same renderer as the main view with the whole alignment as its
 * window, so a large alignment is sampled per pixel instead of rasterised in full.
 */
export function Minimap({
  colorIndex,
  rowOrder,
  sequences,
  numColumns,
  numSeqs,
  pixelWidth,
  pixelHeight,
  viewport,
  setViewport,
  panBy,
}: {
  colorIndex: ColorIndex;
  rowOrder: readonly number[];
  sequences: readonly string[];
  numColumns: number;
  numSeqs: number;
  pixelWidth: number;
  pixelHeight: number;
  viewport: Viewport;
  setViewport: (next: Viewport | ((prev: Viewport) => Viewport)) => void;
  panBy: (dx: number, dy: number) => void;
}) {
  const dragRef = useRef<{ mode: DragMode; lastX: number; lastY: number } | null>(null);
  const [hoverZone, setHoverZone] = useState<DragMode | "outside" | null>(null);

  const scaleX = numColumns > 0 ? numColumns / pixelWidth : 0;
  const scaleY = numSeqs > 0 ? numSeqs / pixelHeight : 0;

  // The viewport may extend past the data (a small alignment in a large canvas); clamp the box to it.
  const clampX = (x: number) => Math.max(0, Math.min(pixelWidth, x));
  const clampY = (y: number) => Math.max(0, Math.min(pixelHeight, y));
  const boxLeft = numColumns > 0 ? clampX((viewport.x0 / numColumns) * pixelWidth) : 0;
  const boxRight = numColumns > 0 ? clampX((viewport.x1 / numColumns) * pixelWidth) : pixelWidth;
  const boxTop = numSeqs > 0 ? clampY((viewport.y0 / numSeqs) * pixelHeight) : 0;
  const boxBottom = numSeqs > 0 ? clampY((viewport.y1 / numSeqs) * pixelHeight) : pixelHeight;

  const zoneAt = useCallback(
    (localX: number, localY: number): DragMode | "outside" => {
      const insideVertically = localY >= boxTop && localY <= boxBottom;
      if (!insideVertically) return "outside";
      if (Math.abs(localX - boxLeft) <= MINIMAP_EDGE_ZONE) return "resize-left";
      if (Math.abs(localX - boxRight) <= MINIMAP_EDGE_ZONE) return "resize-right";
      if (localX >= boxLeft && localX <= boxRight) return "pan";
      return "outside";
    },
    [boxLeft, boxRight, boxTop, boxBottom]
  );

  const jumpTo = useCallback(
    (localX: number, localY: number) => {
      const centerX = localX * scaleX;
      const centerY = localY * scaleY;
      const spanX = viewport.x1 - viewport.x0;
      const spanY = viewport.y1 - viewport.y0;
      setViewport((prev) =>
        clampToExtent({
          ...prev,
          x0: centerX - spanX / 2,
          x1: centerX + spanX / 2,
          y0: centerY - spanY / 2,
          y1: centerY + spanY / 2,
        })
      );
    },
    [scaleX, scaleY, viewport.x1, viewport.x0, viewport.y1, viewport.y0, setViewport]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const zone = zoneAt(localX, localY);

      if (zone === "outside") {
        jumpTo(localX, localY);
        dragRef.current = { mode: "pan", lastX: localX, lastY: localY };
      } else {
        dragRef.current = { mode: zone, lastX: localX, lastY: localY };
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [zoneAt, jumpTo]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      if (!dragRef.current) {
        setHoverZone(zoneAt(localX, localY));
        return;
      }

      const { mode, lastX, lastY } = dragRef.current;
      const dx = (localX - lastX) * scaleX;
      const dy = (localY - lastY) * scaleY;
      dragRef.current = { mode, lastX: localX, lastY: localY };

      if (mode === "pan") {
        panBy(dx, dy);
      } else if (mode === "resize-left") {
        setViewport((prev) => clampToExtent({ ...prev, x0: prev.x0 + dx }));
      } else if (mode === "resize-right") {
        setViewport((prev) => clampToExtent({ ...prev, x1: prev.x1 + dx }));
      }
    },
    [scaleX, scaleY, panBy, setViewport, zoneAt]
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const cursor =
    hoverZone === "resize-left" || hoverZone === "resize-right"
      ? "ew-resize"
      : hoverZone === "pan"
        ? "grab"
        : "pointer";

  return (
    <div
      className={css({ position: "relative", touchAction: "none" })}
      style={{ width: pixelWidth, height: pixelHeight, cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHoverZone(null)}
    >
      <AlignmentCanvas
        colorIndex={colorIndex}
        rowOrder={rowOrder}
        sequences={sequences}
        window={FULL_WINDOW(numColumns, numSeqs)}
        width={pixelWidth}
        height={pixelHeight}
        showLetters={false}
        letterColor="transparent"
      />
      <div
        className={css({
          position: "absolute",
          border: "2px solid var(--rbv-accent)",
          backgroundColor: "rgb(var(--rbv-accent-rgb) / 0.18)",
          pointerEvents: "none",
        })}
        style={{
          left: boxLeft,
          top: boxTop,
          width: Math.max(1, boxRight - boxLeft),
          height: Math.max(1, boxBottom - boxTop),
        }}
      />
    </div>
  );
}
