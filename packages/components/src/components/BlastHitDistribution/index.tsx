import { useMemo } from "react";
import {
  ROOT_CLASS,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useControllableState,
  useViewport,
  ViewportToolbar,
} from "@react-bio-viz/core";

import { DEFAULT_METRIC, METRICS } from "./constants";
import { SimpleBlastHitDistribution } from "./SimpleBlastHitDistribution";
import type { BlastHitDistributionProps, BlastMetric } from "./types";
import { metricLabel } from "./utils/metrics";
import { EMPTY_SELECTION } from "./utils/selection";

export { SimpleBlastHitDistribution } from "./SimpleBlastHitDistribution";
export { blastHitsFromResult } from "./utils/blastResult";
export type {
  BlastHit,
  BlastHitDistributionProps,
  BlastMetric,
  HitSelection,
  SimpleBlastHitDistributionProps,
} from "./types";

/**
 * @public
 * @group Components
 * BLAST hits along one query sequence, stacked into rows where they overlap and coloured by a
 * metric chosen in its selector, with a pan/zoom toolbar. Clicking a hit toggles it in the
 * selection. The `metric`, `viewport` and `selection` are controllable;
 * {@link SimpleBlastHitDistribution} is the same view without the toolbar, fully controlled.
 */
export function BlastHitDistribution({
  metric,
  defaultMetric = DEFAULT_METRIC,
  onMetricChange,
  metricStore,
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  selection,
  defaultSelection,
  onSelectionChange,
  selectionStore,
  ...viewProps
}: BlastHitDistributionProps): React.JSX.Element {
  const [currentMetric, setMetric] = useControllableState<BlastMetric>({
    value: metric,
    defaultValue: defaultMetric,
    onChange: onMetricChange,
    store: metricStore,
  });
  const [currentSelection, setSelection] = useControllableState({
    value: selection,
    defaultValue: defaultSelection ?? EMPTY_SELECTION,
    onChange: onSelectionChange,
    store: selectionStore,
  });
  const { queryLength, width = 800 } = viewProps;
  const extent = useMemo(() => ({ xMin: 0, xMax: queryLength, yMin: 0, yMax: 1 }), [queryLength]);
  const {
    viewport: current,
    setViewport,
    panBy,
    zoomBy,
    reset,
  } = useViewport({ extent, viewport, defaultViewport, onViewportChange, viewportStore });

  return (
    <div className={`${ROOT_CLASS} text-foreground`} style={{ width }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewportToolbar viewport={current} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="x" />
        <Select value={currentMetric} onValueChange={(next) => setMetric(next as BlastMetric)}>
          <SelectTrigger aria-label="Color by metric">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map((option) => (
              <SelectItem key={option} value={option}>
                {metricLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <SimpleBlastHitDistribution
        {...viewProps}
        metric={currentMetric}
        viewport={current}
        onViewportChange={setViewport}
        selection={currentSelection}
        onSelectionChange={setSelection}
      />
    </div>
  );
}
