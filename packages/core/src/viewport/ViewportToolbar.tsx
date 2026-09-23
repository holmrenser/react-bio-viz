import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "../components/ui";
import type { Viewport } from "./Viewport";

const PAN_FRACTION = 0.5;
const ZOOM_FACTOR = 0.5;

/** @public */
export interface ViewportToolbarProps {
  viewport: Viewport;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
  /** Which pan directions to show. @defaultValue "both" */
  axes?: "x" | "y" | "both";
}

/**
 * @public
 * Shared pan/zoom toolbar for any {@link useViewport}-backed component (MultipleSequenceAlignment,
 * GeneModel, PhyloTree, GenomeBrowser), built on shadcn/ui's `Button`. `axes` controls which pan
 * directions are shown — a 1D viewport (e.g. GeneModel's genomic coordinate) only needs `"x"`.
 */
export function ViewportToolbar({ viewport, panBy, zoomBy, reset, axes = "both" }: ViewportToolbarProps) {
  const spanX = viewport.x1 - viewport.x0;
  const spanY = viewport.y1 - viewport.y0;
  const canPanLeft = viewport.x0 > viewport.xMin;
  const canPanRight = viewport.x1 < viewport.xMax;
  const canPanUp = viewport.y0 > viewport.yMin;
  const canPanDown = viewport.y1 < viewport.yMax;
  const isFullyZoomedOut = spanX >= viewport.xMax - viewport.xMin && spanY >= viewport.yMax - viewport.yMin;
  const showX = axes === "x" || axes === "both";
  const showY = axes === "y" || axes === "both";

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {(showX || showY) && (
        <div className="flex gap-1">
          {showX && (
            <>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!canPanLeft}
                onClick={() => panBy(-spanX * PAN_FRACTION, 0)}
                aria-label="Pan left"
              >
                <ArrowLeft />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!canPanRight}
                onClick={() => panBy(spanX * PAN_FRACTION, 0)}
                aria-label="Pan right"
              >
                <ArrowRight />
              </Button>
            </>
          )}
          {showY && (
            <>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!canPanUp}
                onClick={() => panBy(0, -spanY * PAN_FRACTION)}
                aria-label="Pan up"
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={!canPanDown}
                onClick={() => panBy(0, spanY * PAN_FRACTION)}
                aria-label="Pan down"
              >
                <ArrowDown />
              </Button>
            </>
          )}
        </div>
      )}
      <div className="flex gap-1">
        <Button size="icon-sm" variant="outline" onClick={() => zoomBy(ZOOM_FACTOR)} aria-label="Zoom in">
          <ZoomIn />
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={isFullyZoomedOut}
          onClick={() => zoomBy(1 / ZOOM_FACTOR)}
          aria-label="Zoom out"
        >
          <ZoomOut />
        </Button>
        <Button size="icon-sm" variant="outline" disabled={isFullyZoomedOut} onClick={reset} aria-label="Reset zoom">
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}
