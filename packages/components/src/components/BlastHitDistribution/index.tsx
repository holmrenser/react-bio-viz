import { useMemo } from "react";
import { css, cx } from "@emotion/css";
import {
  ACCENT_COLOR,
  createLinearScale,
  createSequentialColorScale,
  Popover,
  PopoverBody,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  stackIntervals,
  useControllableState,
  useDragPan,
  useViewport,
  useWheelZoom,
  ViewportToolbar,
  ROOT_CLASS,
} from "@react-bio-viz/core";

import { Scale } from "../GeneModel/components/Scale";
import {
  DEFAULT_METRIC,
  HIT_HEIGHT,
  HIT_ROW_HEIGHT,
  MARGIN,
  METRICS,
  SCALE_HEIGHT,
  SELECTED_STROKE_WIDTH,
} from "./constants";
import type { BlastHit, BlastHitDistributionProps, BlastMetric, HitSelection } from "./types";
import { formatMetricValue, metricLabel, metricScore } from "./utils/metrics";

export type { BlastHit, BlastHitDistributionProps, BlastMetric, HitSelection } from "./types";

const DEFAULT_SELECTION: HitSelection = { selectedHitIds: [] };

function defaultHitPopover(hit: BlastHit): JSX.Element {
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
 * Overlaid BLAST hits along a single query sequence, row-stacked to avoid overlap and colored by
 * a chosen metric. Clicking a hit toggles it in `selection.selectedHitIds` — brush-to-select
 * (`selection.brushRange`) is reserved for a future enhancement, not implemented here.
 */
export function BlastHitDistribution({
  hits,
  queryLength,
  queryName = "",
  width = 800,
  showScale = true,
  metric,
  defaultMetric = DEFAULT_METRIC,
  onMetricChange,
  hitPopoverFn = defaultHitPopover,
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  selection,
  defaultSelection,
  onSelectionChange,
  selectionStore,
}: BlastHitDistributionProps): JSX.Element {
  const [currentMetric, setMetric] = useControllableState<BlastMetric>({
    value: metric,
    defaultValue: defaultMetric,
    onChange: onMetricChange,
  });

  const [currentSelection, setSelection] = useControllableState<HitSelection>({
    value: selection,
    defaultValue: defaultSelection ?? DEFAULT_SELECTION,
    onChange: onSelectionChange,
    store: selectionStore,
  });

  const mainWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const extent = useMemo(() => ({ xMin: 0, xMax: queryLength, yMin: 0, yMax: 1 }), [queryLength]);
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

  const rows = useMemo(
    () => stackIntervals(hits.map((hit) => ({ id: hit.id, start: hit.queryStart, end: hit.queryEnd }))),
    [hits]
  );
  const rowCount = useMemo(() => {
    let max = -1;
    for (const row of rows.values()) max = Math.max(max, row);
    return max + 1;
  }, [rows]);

  const colorScale = useMemo(() => {
    const scores = hits.map((hit) => metricScore(hit, currentMetric));
    const domain: [number, number] = scores.length > 0 ? [Math.min(...scores), Math.max(...scores)] : [0, 1];
    return createSequentialColorScale({ domain });
  }, [hits, currentMetric]);

  const scaleHeight = showScale ? SCALE_HEIGHT : 0;
  const trackTop = MARGIN.top + scaleHeight;
  const totalHeight = trackTop + Math.max(1, rowCount) * HIT_ROW_HEIGHT + MARGIN.bottom;

  function toggleHit(hitId: string) {
    setSelection((prev) => ({
      ...prev,
      selectedHitIds: prev.selectedHitIds.includes(hitId)
        ? prev.selectedHitIds.filter((id) => id !== hitId)
        : [...prev.selectedHitIds, hitId],
    }));
  }

  return (
    <div className={cx(ROOT_CLASS, "text-foreground", css({ display: "flex", flexDirection: "column", width }))}>
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        })}
      >
        <ViewportToolbar viewport={currentViewport} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="x" />
        <Select value={currentMetric} onValueChange={(next) => setMetric(next as BlastMetric)}>
          <SelectTrigger aria-label="Color by metric">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map((m) => (
              <SelectItem key={m} value={m}>
                {metricLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <svg
        width={width}
        height={totalHeight}
        className={css({ touchAction: "none" })}
        {...dragHandlers}
        {...wheelHandlers}
      >
        {showScale && (
          <Scale scale={scale} transform={`translate(${MARGIN.left},${MARGIN.top})`} seqid={queryName} />
        )}
        <g transform={`translate(${MARGIN.left},${trackTop})`}>
          {hits.map((hit) => {
            const row = rows.get(hit.id) ?? 0;
            const x = scale(hit.queryStart);
            const w = Math.max(1, scale(hit.queryEnd) - scale(hit.queryStart));
            const isSelected = currentSelection.selectedHitIds.includes(hit.id);
            const fill = colorScale(metricScore(hit, currentMetric));
            return (
              <Popover key={hit.id}>
                <PopoverTrigger asChild>
                  <rect
                    x={x}
                    y={row * HIT_ROW_HEIGHT}
                    width={w}
                    height={HIT_HEIGHT}
                    fill={fill}
                    stroke={isSelected ? ACCENT_COLOR : "none"}
                    strokeWidth={isSelected ? SELECTED_STROKE_WIDTH : 0}
                    className={css({ cursor: "pointer" })}
                    data-pan-ignore
                    data-testid={`hit-${hit.id}`}
                    data-selected={isSelected || undefined}
                    onClick={() => toggleHit(hit.id)}
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
