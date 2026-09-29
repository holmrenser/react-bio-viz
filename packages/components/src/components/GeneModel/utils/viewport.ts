import { fitToExtent, type SequenceInterval, type Viewport } from "@react-bio-viz/core";

import { VIEWPORT_PADDING_RATIO } from "../constants";

type Extent = Pick<Viewport, "xMin" | "xMax" | "yMin" | "yMax">;

/** The pannable extent: the gene plus {@link VIEWPORT_PADDING_RATIO} of its length on each side. */
export function geneExtent(gene: Pick<SequenceInterval, "start" | "end">): Extent {
  const padding = Math.round(VIEWPORT_PADDING_RATIO * (gene.end - gene.start));
  return { xMin: Math.max(0, gene.start - padding), xMax: gene.end + padding, yMin: 0, yMax: 1 };
}

/**
 * The deprecated `panMin`/`panMax` (percentages of the gene's length, trimmed from either end of the
 * extent) as a viewport. The defaults, 0 and 100, show the whole extent.
 */
export function legacyPanViewport(panMin: number, panMax: number, extent: Extent, geneLength: number): Viewport {
  const start = Math.min(Math.max(0, panMin), 100) / 100;
  const end = 1 - Math.max(Math.min(100, panMax), 0) / 100;
  return { ...fitToExtent(extent), x0: extent.xMin + start * geneLength, x1: extent.xMax - end * geneLength };
}
