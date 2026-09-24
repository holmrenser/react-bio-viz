import { useMemo } from "react";
import { css, cx } from "@emotion/css";
import { createLinearScale, ROOT_CLASS, useDragPan, useViewport, useWheelZoom, ViewportToolbar } from "@react-bio-viz/core";

import { Scale } from "../GeneModel/components/Scale";
import {
  DEFAULT_COVERAGE_TRACK_HEIGHT,
  FEATURE_ROW_HEIGHT,
  MARGIN,
  SCALE_HEIGHT,
  TRACK_GAP,
} from "./constants";
import { CoverageTrackRenderer } from "./tracks/CoverageTrack";
import { FeatureTrackRenderer, featureTrackHeight } from "./tracks/FeatureTrack";
import { GeneModelTrackRenderer, geneModelTrackHeight } from "./tracks/GeneModelTrack";
import type { GenomeBrowserProps, GenomeTrack, TrackRenderer } from "./types";

export type {
  CoveragePoint,
  CoverageTrack,
  FeatureTrack,
  GeneModelTrack,
  GenomeBrowserProps,
  GenomeFeature,
  GenomeTrack,
  TrackRenderer,
  TrackRenderProps,
} from "./types";

function defaultTrackHeight(track: GenomeTrack): number {
  if (track.height) return track.height;
  switch (track.kind) {
    case "feature":
      return Math.max(FEATURE_ROW_HEIGHT, featureTrackHeight(track.data));
    case "coverage":
      return DEFAULT_COVERAGE_TRACK_HEIGHT;
    case "genemodel":
      return geneModelTrackHeight(track.data);
    default:
      return FEATURE_ROW_HEIGHT;
  }
}

const BUILTIN_RENDERERS: Record<string, TrackRenderer> = {
  feature: FeatureTrackRenderer as TrackRenderer,
  coverage: CoverageTrackRenderer as TrackRenderer,
  genemodel: GeneModelTrackRenderer as TrackRenderer,
};

/**
 * @public
 * @group Components
 * A multi-track genome browser: a shared genomic-coordinate viewport (pan/zoom, controllable like
 * every other stateful prop in this library) with `"feature"`, `"coverage"`, and `"genemodel"`
 * tracks stacked underneath a position ruler. `trackRenderers` lets a consumer add a custom track
 * kind or override a built-in one.
 */
export function GenomeBrowser(props: GenomeBrowserProps): JSX.Element {
  const {
    tracks,
    referenceLength,
    referenceName = "",
    width = 1000,
    showScale = true,
    trackRenderers,
    viewport,
    defaultViewport,
    onViewportChange,
    viewportStore,
  } = props;
  const mainWidth = Math.max(1, width - MARGIN.left - MARGIN.right);

  const extent = useMemo(() => ({ xMin: 0, xMax: referenceLength, yMin: 0, yMax: 1 }), [referenceLength]);

  const {
    viewport: currentViewport,
    panBy,
    zoomBy,
    zoomAt,
    reset,
  } = useViewport({ extent, viewport, defaultViewport, onViewportChange, viewportStore });

  const scale = createLinearScale([currentViewport.x0, currentViewport.x1], [0, mainWidth]);

  const dragHandlers = useDragPan({
    onPan: (dx) => panBy(dx, 0),
    scaleX: mainWidth > 0 ? (currentViewport.x1 - currentViewport.x0) / mainWidth : 0,
    scaleY: 0,
  });

  const wheelHandlers = useWheelZoom({
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX) => ({
      x: currentViewport.x0 + (mainWidth > 0 ? (pixelX / mainWidth) * (currentViewport.x1 - currentViewport.x0) : 0),
      y: 0,
    }),
  });

  const renderers = { ...BUILTIN_RENDERERS, ...trackRenderers };

  const scaleHeight = showScale ? SCALE_HEIGHT : 0;
  const trackLayout = useMemo(() => {
    let y = MARGIN.top + scaleHeight;
    return tracks.map((track) => {
      const height = defaultTrackHeight(track);
      const layout = { track, y, height };
      y += height + TRACK_GAP;
      return layout;
    });
  }, [tracks, scaleHeight]);

  const lastTrack = trackLayout[trackLayout.length - 1];
  const totalHeight = (lastTrack ? lastTrack.y + lastTrack.height : MARGIN.top + scaleHeight) + MARGIN.bottom;

  return (
    <div className={cx(ROOT_CLASS, "text-foreground", css({ display: "flex", flexDirection: "column", width }))}>
      <ViewportToolbar viewport={currentViewport} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="x" />
      <div className={css({ display: "flex" })}>
        <div className={css({ width: MARGIN.left, flexShrink: 0 })}>
          <svg width={MARGIN.left} height={totalHeight}>
            {trackLayout.map(({ track, y, height }) => (
              <text
                key={track.id}
                x={4}
                y={y + height / 2}
                dominantBaseline="middle"
                fontSize={11}
                fill="currentColor"
              >
                {track.label}
              </text>
            ))}
          </svg>
        </div>
        <svg
          width={mainWidth}
          height={totalHeight}
          className={css({ touchAction: "none" })}
          {...dragHandlers}
          {...wheelHandlers}
        >
          {showScale && (
            <Scale scale={scale} transform={`translate(0,${MARGIN.top + 14})`} seqid={referenceName} />
          )}
          {trackLayout.map(({ track, y, height }) => {
            const renderer = renderers[track.kind];
            if (!renderer) return null;
            return (
              <g key={track.id} transform={`translate(0,${y})`}>
                {renderer({ track, scale, viewport: currentViewport, width: mainWidth, height })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
