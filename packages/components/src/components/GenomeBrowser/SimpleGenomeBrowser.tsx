import { useMemo } from "react";
import {
  AxisRuler,
  createLinearScale,
  fitToExtent,
  ROOT_CLASS,
  useDragPan,
  useViewport,
  useWheelZoom,
} from "@react-bio-viz/core";

import { MARGIN } from "./constants";
import { CoverageTrackRenderer } from "./tracks/CoverageTrack";
import { FeatureTrackRenderer } from "./tracks/FeatureTrack";
import { GeneModelTrackRenderer } from "./tracks/GeneModelTrack";
import type { SimpleGenomeBrowserProps, TrackRenderer } from "./types";
import { layoutTracks } from "./utils/trackLayout";

const BUILTIN_RENDERERS: Record<string, TrackRenderer> = {
  feature: FeatureTrackRenderer as TrackRenderer,
  coverage: CoverageTrackRenderer as TrackRenderer,
  genemodel: GeneModelTrackRenderer as TrackRenderer,
};

/**
 * @public
 * @group Components
 * The view inside {@link GenomeBrowser}, without its toolbar, and controlled: dragging and
 * scrolling report the next window through `onViewportChange`, and it shows once passed back as
 * `viewport`.
 */
export function SimpleGenomeBrowser({
  tracks,
  referenceLength,
  referenceName = "",
  width = 1000,
  showScale = true,
  trackRenderers,
  viewport,
  onViewportChange,
}: SimpleGenomeBrowserProps): React.JSX.Element {
  const extent = useMemo(() => ({ xMin: 0, xMax: referenceLength, yMin: 0, yMax: 1 }), [referenceLength]);
  const current = useMemo(() => viewport ?? fitToExtent(extent), [viewport, extent]);
  const { panBy, zoomAt } = useViewport({ extent, viewport: current, onViewportChange });

  const mainWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const unitsPerPixel = (current.x1 - current.x0) / mainWidth;
  const scale = createLinearScale([current.x0, current.x1], [0, mainWidth]);
  const dragHandlers = useDragPan({ onPan: (dx) => panBy(dx, 0), scaleX: unitsPerPixel, scaleY: 0 });
  const wheel = useWheelZoom({
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX) => ({ x: current.x0 + pixelX * unitsPerPixel, y: 0 }),
  });

  const renderers = { ...BUILTIN_RENDERERS, ...trackRenderers };
  const { rows, totalHeight } = useMemo(() => layoutTracks(tracks, showScale), [tracks, showScale]);

  return (
    <div className={`${ROOT_CLASS} flex text-foreground`} style={{ width }}>
      <svg className="shrink-0" width={MARGIN.left} height={totalHeight}>
        {rows.map(({ track, y, height }) => (
          <text key={track.id} x={4} y={y + height / 2} dominantBaseline="middle" fontSize={11} fill="currentColor">
            {track.label}
          </text>
        ))}
      </svg>
      <svg width={mainWidth} height={totalHeight} className="touch-none" {...dragHandlers} {...wheel}>
        {showScale && <AxisRuler scale={scale} transform={`translate(0,${MARGIN.top + 14})`} label={referenceName} />}
        {rows.map(({ track, y, height }) => {
          const renderer = renderers[track.kind];
          return renderer ? (
            <g key={track.id} transform={`translate(0,${y})`}>
              {renderer({ track, scale, viewport: current, width: mainWidth, height })}
            </g>
          ) : null;
        })}
      </svg>
    </div>
  );
}
