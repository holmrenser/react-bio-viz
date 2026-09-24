import { useMemo } from "react";
import { css } from "@emotion/css";
import {
  createCategoricalColorScale,
  createLinearScale,
  useDragPan,
  useViewport,
  useWheelZoom,
  ViewportToolbar,
  type Viewport,
  ROOT_CLASS,
} from "@react-bio-viz/core";

import { Exon } from "./components/Exon";
import { defaultPopoverFn } from "./components/IntervalPopover";
import { Scale } from "./components/Scale";
import { Transcript } from "./components/Transcript";
import { CHROME_HEIGHT, MARGIN, SCALE_HEIGHT, TRANSCRIPT_HEIGHT, VIEWPORT_PADDING_RATIO } from "./constants";
import type { GeneModelProps, SequenceInterval } from "./types";
import { getTranscriptChildren, getTranscripts, groupByID } from "./utils/intervals";

export type { GeneModelProps, SequenceInterval } from "./types";
export { defaultPopoverFn } from "./components/IntervalPopover";

/** Reproduces the pre-1.0 `panMin`/`panMax` (0-100%) math as a `Viewport`, for the deprecated props. */
function legacyPanToViewport(
  panMin: number,
  panMax: number,
  extent: { xMin: number; xMax: number },
  geneLength: number
): Viewport {
  const clampedMin = Math.min(Math.max(0, panMin), 100) / 100;
  const clampedMax = 1 - Math.max(Math.min(100, panMax), 0) / 100;
  return {
    x0: extent.xMin + clampedMin * geneLength,
    x1: extent.xMax - clampedMax * geneLength,
    y0: 0,
    y1: 1,
    xMin: extent.xMin,
    xMax: extent.xMax,
    yMin: 0,
    yMax: 1,
  };
}

/**
 * @public
 * @group Components
 * GeneModel component, genome browser style. Visualizes gene, mRNA, CDS and exon relationships.
 * Exons have popovers that display additional information. Pan/zoom over the genomic coordinate
 * window is controllable like every other stateful prop in this library — see `viewport`/
 * `defaultViewport`/`onViewportChange`/`viewportStore` and
 * {@link https://holmrenser.github.io/react-bio-viz/concepts/controllable-state/ | Controllable state}.
 *
 * @example A minimal setting:
 *
 * ```typescript
 * import { GeneModel } from 'react-bio-viz';
 * <GeneModel gene={gene} />
 * ```
 *
 * @example Zooming in on the left-most half of the gene, fully controlled:
 *
 * ```typescript
 * import { GeneModel } from 'react-bio-viz';
 * <GeneModel gene={gene} viewport={viewport} onViewportChange={setViewport} />
 * ```
 *
 * @returns SVG visualisation of a (potentially spliced) gene model containing mRNA, exons, and CDSs
 */
export function GeneModel(props: GeneModelProps): JSX.Element {
  const {
    gene,
    width = 500,
    colorSeed = "42",
    showScale = true,
    exonPopoverFn = defaultPopoverFn,
    panMin = 0,
    panMax = 100,
    viewport,
    defaultViewport,
    onViewportChange,
    viewportStore,
  } = props;
  const geneLength = gene.end - gene.start;
  const padding = Math.round(VIEWPORT_PADDING_RATIO * geneLength);

  const extent = useMemo(
    () => ({
      xMin: Math.max(0, gene.start - padding),
      xMax: gene.end + padding,
      yMin: 0,
      yMax: 1,
    }),
    [gene.start, gene.end, padding]
  );

  const legacyDefaultViewport = useMemo(
    () => legacyPanToViewport(panMin, panMax, extent, geneLength),
    [panMin, panMax, extent, geneLength]
  );

  const {
    viewport: currentViewport,
    panBy,
    zoomBy,
    zoomAt,
    reset,
  } = useViewport({
    extent,
    viewport,
    defaultViewport: defaultViewport ?? legacyDefaultViewport,
    onViewportChange,
    viewportStore,
  });

  const intervals: Map<string, SequenceInterval[]> = useMemo(() => groupByID(gene.children ?? []), [gene.children]);
  const transcripts = useMemo(() => getTranscripts(gene), [gene]);
  const height = TRANSCRIPT_HEIGHT * transcripts.length + CHROME_HEIGHT;
  const mainWidth = width - MARGIN.left - MARGIN.right;

  const scale = createLinearScale([currentViewport.x0, currentViewport.x1], [MARGIN.left, width - MARGIN.right]);
  const { base: baseColor, contrast: contrastColor } = useMemo(() => createCategoricalColorScale()(colorSeed), [colorSeed]);

  const dragHandlers = useDragPan({
    onPan: (dx) => panBy(dx, 0),
    scaleX: mainWidth > 0 ? (currentViewport.x1 - currentViewport.x0) / mainWidth : 0,
    scaleY: 0,
  });

  const wheelHandlers = useWheelZoom({
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX) => ({
      x:
        currentViewport.x0 +
        (mainWidth > 0 ? ((pixelX - MARGIN.left) / mainWidth) * (currentViewport.x1 - currentViewport.x0) : 0),
      y: 0,
    }),
  });

  return (
    <div className={`${ROOT_CLASS} genemodel text-foreground`}>
      <ViewportToolbar viewport={currentViewport} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="x" />
      <svg
        height={height}
        width={width}
        className={css({ touchAction: "none" })}
        {...dragHandlers}
        {...wheelHandlers}
      >
        <g className="genemodel" transform="translate(0,8)">
          {transcripts.map((transcript: SequenceInterval, index) => {
            const transcriptChildren = getTranscriptChildren({ transcript, intervals });
            return (
              <Transcript scale={scale} key={transcript.ID} transcript={transcript} index={index}>
                {transcriptChildren
                  .slice()
                  .sort((interval) => (interval.interval_type === "CDS" ? 1 : 0))
                  .map((interval: SequenceInterval) => (
                    <Exon
                      scale={scale}
                      key={interval.ID}
                      interval={interval}
                      baseColor={baseColor}
                      contrastColor={contrastColor}
                      exonPopoverFn={exonPopoverFn}
                    />
                  ))}
              </Transcript>
            );
          })}
        </g>
        {showScale && <Scale scale={scale} transform={`translate(0,${height - SCALE_HEIGHT})`} seqid={gene.seqid} />}
        <defs>
          <marker
            id="arrowEnd"
            markerWidth="16"
            markerHeight="10"
            refX="0"
            refY="5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,5 L15,5 L10,10 M10,0 L15,5" fill="none" stroke="currentColor" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
