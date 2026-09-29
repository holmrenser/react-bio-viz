import { useCallback } from "react";
import { ROOT_CLASS, useControllableState, useViewport, ViewportToolbar, zoomBy } from "@react-bio-viz/core";

import { CELL_HEIGHT, CELL_WIDTH, DEFAULT_PANEL_SIZES, NO_ORDER, TOOLBAR_HEIGHT } from "./constants";
import { SimpleDistanceMatrix } from "./SimpleDistanceMatrix";
import type { DistanceMatrixProps } from "./types";
import { computeGridLayout, defaultGridViewport, limitGridZoom } from "./utils/layout";

export { SimpleDistanceMatrix } from "./SimpleDistanceMatrix";
export type {
  DistanceColorScheme,
  DistanceMatrixHover,
  DistanceMatrixOptions,
  DistanceMatrixPanelSizes,
  DistanceMatrixProps,
  SimpleDistanceMatrixProps,
} from "./types";
export { distanceColor } from "./utils/colors";

/**
 * @public
 * @group Components
 * A pairwise distance matrix as a heatmap, with a pan/zoom toolbar: row names on the left, column
 * names on top, cells shaded by distance, with values written in once cells are large enough.
 * Drawn on canvas, only the visible window, so it scales to thousands of sequences.
 *
 * Scroll to pan, Ctrl/⌘-scroll to zoom, drag to pan; drag row names to reorder rows and columns
 * together. The `viewport`, `rowOrder` and `panelSizes` are controllable, and `rowOrder` has the
 * MSA's shape, so one store can order an alignment, its tree and its distance matrix together.
 * {@link SimpleDistanceMatrix} is the same view without the toolbar, fully controlled.
 */
export function DistanceMatrix({
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  rowOrder,
  defaultRowOrder,
  onRowOrderChange,
  rowOrderStore,
  panelSizes,
  defaultPanelSizes,
  onPanelSizesChange,
  panelSizesStore,
  ...viewProps
}: DistanceMatrixProps): React.JSX.Element {
  const { labels, width = 650, height = 500, options } = viewProps;
  const { showToolbar = true, cellWidth = CELL_WIDTH, cellHeight = CELL_HEIGHT, showLabels = true } = options ?? {};

  const [currentRowOrder, setRowOrder] = useControllableState({
    value: rowOrder,
    defaultValue: defaultRowOrder ?? NO_ORDER,
    onChange: onRowOrderChange,
    store: rowOrderStore,
  });
  const [currentPanelSizes, setPanelSizes] = useControllableState({
    value: panelSizes,
    defaultValue: { ...DEFAULT_PANEL_SIZES, ...defaultPanelSizes },
    onChange: onPanelSizesChange,
    store: panelSizesStore,
  });

  const viewHeight = height - (showToolbar ? TOOLBAR_HEIGHT : 0);
  const layout = computeGridLayout({
    count: labels.length,
    width,
    height: viewHeight,
    cellWidth,
    cellHeight,
    labelWidth: showLabels ? currentPanelSizes.labelWidth : null,
  });
  const initial = defaultGridViewport(labels.length, layout, cellWidth, cellHeight);
  const {
    viewport: current,
    setViewport,
    panBy,
  } = useViewport({ extent: initial, viewport, defaultViewport: defaultViewport ?? initial, onViewportChange, viewportStore });
  const zoomToolbar = useCallback(
    (factor: number) => setViewport((prev) => zoomBy(prev, limitGridZoom(factor, prev, layout))),
    [setViewport, layout]
  );

  return (
    <div className={`${ROOT_CLASS} flex flex-col text-foreground`} style={{ width }}>
      {showToolbar && (
        <div style={{ height: TOOLBAR_HEIGHT }}>
          <ViewportToolbar
            viewport={current}
            panBy={panBy}
            zoomBy={zoomToolbar}
            reset={() => setViewport(initial)}
            axes="both"
          />
        </div>
      )}
      <SimpleDistanceMatrix
        {...viewProps}
        height={viewHeight}
        viewport={current}
        onViewportChange={setViewport}
        rowOrder={currentRowOrder}
        onRowOrderChange={setRowOrder}
        panelSizes={currentPanelSizes}
        onPanelSizesChange={setPanelSizes}
      />
    </div>
  );
}
