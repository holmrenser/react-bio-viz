import { useMemo } from "react";
import { ROOT_CLASS, useViewport, ViewportToolbar } from "@react-bio-viz/core";

import { SimpleGeneModel } from "./SimpleGeneModel";
import type { GeneModelProps } from "./types";
import { geneExtent, legacyPanViewport } from "./utils/viewport";

export { SimpleGeneModel } from "./SimpleGeneModel";
export type { GeneModelProps, SimpleGeneModelProps } from "./types";

/**
 * @public
 * @group Components
 * A gene model — transcripts with their exons and CDSs — on a genomic axis, with a pan/zoom
 * toolbar. Drag to pan, scroll to zoom, click an exon or CDS for its details. The viewport is
 * controllable (`viewport`/`defaultViewport`/`onViewportChange`/`viewportStore`);
 * {@link SimpleGeneModel} is the same view without the toolbar, fully controlled.
 *
 * @example
 * ```tsx
 * <GeneModel gene={gene} />
 * <GeneModel gene={gene} viewport={viewport} onViewportChange={setViewport} />
 * ```
 */
export function GeneModel({
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  panMin = 0,
  panMax = 100,
  ...viewProps
}: GeneModelProps): React.JSX.Element {
  const { start, end } = viewProps.gene;
  const extent = useMemo(() => geneExtent({ start, end }), [start, end]);
  const {
    viewport: current,
    setViewport,
    panBy,
    zoomBy,
    reset,
  } = useViewport({
    extent,
    viewport,
    defaultViewport: defaultViewport ?? legacyPanViewport(panMin, panMax, extent, end - start),
    onViewportChange,
    viewportStore,
  });

  return (
    <div className={`${ROOT_CLASS} text-foreground`}>
      <ViewportToolbar viewport={current} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="x" />
      <SimpleGeneModel {...viewProps} viewport={current} onViewportChange={setViewport} />
    </div>
  );
}
