import { useMemo } from "react";
import {
  ACCENT_COLOR,
  AxisRuler,
  countIntervalRows,
  createLinearScale,
  createSequentialColorScale,
  fitToExtent,
  Popover,
  PopoverBody,
  PopoverTrigger,
  ROOT_CLASS,
  stackIntervals,
  useDragPan,
  useViewport,
  useWheelZoom,
} from "@react-bio-viz/core";

import { DEFAULT_METRIC, HIT_HEIGHT, HIT_ROW_HEIGHT, MARGIN, SCALE_HEIGHT, SELECTED_STROKE_WIDTH } from "./constants";
import type { BlastHit, SimpleBlastHitDistributionProps } from "./types";
import { formatMetricValue, metricScore } from "./utils/metrics";
import { EMPTY_SELECTION, toggleHit } from "./utils/selection";

function defaultHitPopover(hit: BlastHit) {
  return (
    <ul>
      <li>Subject: {hit.subjectId}</li>
      <li>
        Query: {hit.queryStart}..{hit.queryEnd}
      </li>
      <li>E-value: {formatMetricValue(hit, "evalue")}</li>
      <li>Bit score: {formatMetricValue(hit, "bitScore")}</li>
      <li>% Identity: {formatMetricValue(hit, "percentIdentity")}</li>
    </ul>
  );
}

/**
 * @public
 * @group Components
 * The view inside {@link BlastHitDistribution}, without its toolbar and metric selector, and
 * controlled: pan/zoom and hit clicks report through `onViewportChange` and `onSelectionChange`,
 * and show once passed back as `viewport` and `selection`.
 */
export function SimpleBlastHitDistribution({
  hits,
  queryLength,
  queryName = "",
  width = 800,
  showScale = true,
  metric = DEFAULT_METRIC,
  hitPopoverFn = defaultHitPopover,
  viewport,
  onViewportChange,
  selection = EMPTY_SELECTION,
  onSelectionChange,
}: SimpleBlastHitDistributionProps): React.JSX.Element {
  const extent = useMemo(() => ({ xMin: 0, xMax: queryLength, yMin: 0, yMax: 1 }), [queryLength]);
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

  const { rows, rowCount } = useMemo(() => {
    const intervals = hits.map((hit) => ({ id: hit.id, start: hit.queryStart, end: hit.queryEnd }));
    return { rows: stackIntervals(intervals), rowCount: countIntervalRows(intervals) };
  }, [hits]);
  const colorScale = useMemo(() => {
    const scores = hits.map((hit) => metricScore(hit, metric));
    const domain: [number, number] = scores.length > 0 ? [Math.min(...scores), Math.max(...scores)] : [0, 1];
    return createSequentialColorScale({ domain });
  }, [hits, metric]);

  const trackTop = MARGIN.top + (showScale ? SCALE_HEIGHT : 0);
  const height = trackTop + Math.max(1, rowCount) * HIT_ROW_HEIGHT + MARGIN.bottom;

  return (
    <div className={`${ROOT_CLASS} text-foreground`}>
      <svg width={width} height={height} className="touch-none" {...dragHandlers} {...wheel}>
        {showScale && (
          <AxisRuler scale={scale} transform={`translate(${MARGIN.left},${MARGIN.top})`} label={queryName} />
        )}
        <g transform={`translate(${MARGIN.left},${trackTop})`}>
          {hits.map((hit) => {
            const isSelected = selection.selectedHitIds.includes(hit.id);
            return (
              <Popover key={hit.id}>
                <PopoverTrigger asChild>
                  <rect
                    x={scale(hit.queryStart)}
                    y={(rows.get(hit.id) ?? 0) * HIT_ROW_HEIGHT}
                    width={Math.max(1, scale(hit.queryEnd) - scale(hit.queryStart))}
                    height={HIT_HEIGHT}
                    fill={colorScale(metricScore(hit, metric))}
                    stroke={isSelected ? ACCENT_COLOR : "none"}
                    strokeWidth={isSelected ? SELECTED_STROKE_WIDTH : 0}
                    className="cursor-pointer"
                    data-pan-ignore
                    data-testid={`hit-${hit.id}`}
                    data-selected={isSelected || undefined}
                    onClick={() => onSelectionChange?.(toggleHit(selection, hit.id))}
                  />
                </PopoverTrigger>
                <PopoverBody header={`${hit.queryId} × ${hit.subjectId}`}>{hitPopoverFn(hit)}</PopoverBody>
              </Popover>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
