import { useMemo } from "react";
import { ROOT_CLASS, useViewport, ViewportToolbar } from "@react-bio-viz/core";

import { SimpleGenomeBrowser } from "./SimpleGenomeBrowser";
import type { GenomeBrowserProps } from "./types";

export { SimpleGenomeBrowser } from "./SimpleGenomeBrowser";
export type {
  CoveragePoint,
  CoverageTrack,
  FeatureTrack,
  GeneModelTrack,
  GenomeBrowserProps,
  GenomeFeature,
  GenomeTrack,
  SimpleGenomeBrowserProps,
  TrackRenderer,
  TrackRenderProps,
} from "./types";

/**
 * @public
 * @group Components
 * Genome tracks — `"feature"`, `"coverage"` and `"genemodel"`, or custom kinds through
 * `trackRenderers` — stacked under one genomic-position ruler, with a pan/zoom toolbar. The
 * viewport is controllable (`viewport`/`defaultViewport`/`onViewportChange`/`viewportStore`);
 * {@link SimpleGenomeBrowser} is the same view without the toolbar, fully controlled.
 */
export function GenomeBrowser({
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  ...viewProps
}: GenomeBrowserProps): React.JSX.Element {
  const { referenceLength, width = 1000 } = viewProps;
  const extent = useMemo(() => ({ xMin: 0, xMax: referenceLength, yMin: 0, yMax: 1 }), [referenceLength]);
  const {
    viewport: current,
    setViewport,
    panBy,
    zoomBy,
    reset,
  } = useViewport({ extent, viewport, defaultViewport, onViewportChange, viewportStore });

  return (
    <div className={`${ROOT_CLASS} text-foreground`} style={{ width }}>
      <ViewportToolbar viewport={current} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="x" />
      <SimpleGenomeBrowser {...viewProps} viewport={current} onViewportChange={setViewport} />
    </div>
  );
}
