import { useMemo } from "react";
import {
  AxisRuler,
  createLinearScale,
  fitToExtent,
  getTranscripts,
  ROOT_CLASS,
  TRANSCRIPT_HEIGHT,
  TranscriptStack,
  useDragPan,
  useViewport,
  useWheelZoom,
} from "@react-bio-viz/core";

import { CHROME_HEIGHT, MARGIN, SCALE_HEIGHT } from "./constants";
import type { SimpleGeneModelProps } from "./types";
import { geneExtent } from "./utils/viewport";

/**
 * @public
 * @group Components
 * The view inside {@link GeneModel}, without its toolbar, and controlled: dragging and scrolling
 * report the next window through `onViewportChange`, and it shows once passed back as `viewport`.
 */
export function SimpleGeneModel({
  gene,
  width = 500,
  colorSeed = "42",
  showScale = true,
  exonPopoverFn,
  viewport,
  onViewportChange,
}: SimpleGeneModelProps): React.JSX.Element {
  const { start, end } = gene;
  const extent = useMemo(() => geneExtent({ start, end }), [start, end]);
  const current = useMemo(() => viewport ?? fitToExtent(extent), [viewport, extent]);
  const { panBy, zoomAt } = useViewport({ extent, viewport: current, onViewportChange });

  const height = TRANSCRIPT_HEIGHT * getTranscripts(gene).length + CHROME_HEIGHT;
  const mainWidth = width - MARGIN.left - MARGIN.right;
  const unitsPerPixel = mainWidth > 0 ? (current.x1 - current.x0) / mainWidth : 0;
  const scale = createLinearScale([current.x0, current.x1], [MARGIN.left, width - MARGIN.right]);

  const dragHandlers = useDragPan({ onPan: (dx) => panBy(dx, 0), scaleX: unitsPerPixel, scaleY: 0 });
  const wheel = useWheelZoom({
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX) => ({ x: current.x0 + (pixelX - MARGIN.left) * unitsPerPixel, y: 0 }),
  });

  return (
    <div className={`${ROOT_CLASS} genemodel text-foreground`}>
      <svg height={height} width={width} className="touch-none" {...dragHandlers} {...wheel}>
        <TranscriptStack gene={gene} scale={scale} colorSeed={colorSeed} popoverFn={exonPopoverFn} />
        {showScale && <AxisRuler scale={scale} transform={`translate(0,${height - SCALE_HEIGHT})`} label={gene.seqid} />}
      </svg>
    </div>
  );
}
