import { useCallback } from "react";
import {
  limitZoomIn,
  ROOT_CLASS,
  useControllableState,
  useViewport,
  ViewportToolbar,
  zoomAt,
} from "@react-bio-viz/core";

import { CELL_SIZE, MAX_CELL_SIZE, NO_ORDER, TOOLBAR_HEIGHT } from "./constants";
import { SimpleMultipleSequenceAlignment } from "./SimpleMultipleSequenceAlignment";
import type { MultipleSequenceAlignmentProps } from "./types";
import { computeAlignmentLayout, defaultAlignmentViewport, resolvePanelSizes } from "./utils/layout";
import { EMPTY_SELECTION } from "./utils/selection";

export { SimpleMultipleSequenceAlignment } from "./SimpleMultipleSequenceAlignment";
export type {
  AlignedSequences,
  MSADrawOptions,
  MSAHover,
  MSAPanelSizes,
  MSASelection,
  MSATrack,
  MultipleSequenceAlignmentProps,
  Sequence,
  SimpleMultipleSequenceAlignmentProps,
} from "./types";
export type { ColorStyle, ColumnColorStyle, ScoreColorStyle } from "./utils/colorStyle";
export { COLOR_STYLES, COLOR_STYLE_GROUPS } from "./utils/colorStyle";
export type { ColumnAnalysis, ColumnStat } from "./utils/msaAnalysis";
export { analyseColumns, computeColumnStats, computeConsensus, computeConservationScores } from "./utils/msaAnalysis";

/**
 * @public
 * @group Components
 * A multiple sequence alignment with a pan/zoom toolbar: a canvas that draws only the visible
 * window (so there is no size limit, and letters stay crisp at any zoom), with a name column, a
 * consensus row, a column ruler, an interactive minimap, optional tracks (conservation, sequence
 * logo, or any per-column score), residue highlighting, and a hover readout.
 *
 * Scroll to pan, Ctrl/⌘-scroll or pinch to zoom, drag to pan; Shift-drag adds to the selection and
 * Cmd/Ctrl-drag toggles it (a plain drag selects in `"select"` mode); click a track to select
 * columns and a label to select rows; drag labels to reorder rows; Delete removes the selection and
 * Escape clears it.
 *
 * The `viewport`, `selection`, `rowOrder` and `panelSizes` are controllable. The alignment is never
 * edited: renames and removals are reported through `onRenameRow`/`onRemoveRows`/`onRemoveColumns`
 * for the caller to apply. {@link SimpleMultipleSequenceAlignment} is the same view without the
 * toolbar, fully controlled.
 */
export function MultipleSequenceAlignment({
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  selection,
  defaultSelection,
  onSelectionChange,
  selectionStore,
  rowOrder,
  defaultRowOrder,
  onRowOrderChange,
  rowOrderStore,
  panelSizes,
  defaultPanelSizes,
  onPanelSizesChange,
  panelSizesStore,
  ...viewProps
}: MultipleSequenceAlignmentProps): React.JSX.Element {
  const { msa, width = 650, height = 400, options = {} } = viewProps;
  const { showToolbar = true, zoomAxes = "both", cellSize = CELL_SIZE } = options;

  const [currentSelection, setSelection] = useControllableState({
    value: selection,
    defaultValue: defaultSelection ?? EMPTY_SELECTION,
    onChange: onSelectionChange,
    store: selectionStore,
  });
  const [currentRowOrder, setRowOrder] = useControllableState({
    value: rowOrder,
    defaultValue: defaultRowOrder ?? NO_ORDER,
    onChange: onRowOrderChange,
    store: rowOrderStore,
  });
  const [currentPanelSizes, setPanelSizes] = useControllableState({
    value: panelSizes,
    defaultValue: resolvePanelSizes(defaultPanelSizes, options.labelWidth),
    onChange: onPanelSizesChange,
    store: panelSizesStore,
  });

  const viewHeight = height - (showToolbar ? TOOLBAR_HEIGHT : 0);
  const layout = computeAlignmentLayout(msa.length, width, viewHeight, options, currentPanelSizes);
  const { mainWidth, mainHeight } = layout;
  const initial = defaultAlignmentViewport(msa[0]?.sequence.length ?? 0, msa.length, layout, cellSize);
  const {
    viewport: current,
    setViewport,
    panBy,
  } = useViewport({ extent: initial, viewport, defaultViewport: defaultViewport ?? initial, onViewportChange, viewportStore });

  // Zoom around the centre, stopping once cells reach MAX_CELL_SIZE.
  const zoomToolbar = useCallback(
    (factor: number) =>
      setViewport((prev) =>
        zoomAt(
          prev,
          { x: (prev.x0 + prev.x1) / 2, y: (prev.y0 + prev.y1) / 2 },
          limitZoomIn(factor, prev.x1 - prev.x0, mainWidth, MAX_CELL_SIZE),
          zoomAxes === "columns" ? 1 : limitZoomIn(factor, prev.y1 - prev.y0, mainHeight, MAX_CELL_SIZE)
        )
      ),
    [setViewport, mainWidth, mainHeight, zoomAxes]
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
      <SimpleMultipleSequenceAlignment
        {...viewProps}
        height={viewHeight}
        viewport={current}
        onViewportChange={setViewport}
        selection={currentSelection}
        onSelectionChange={setSelection}
        rowOrder={currentRowOrder}
        onRowOrderChange={setRowOrder}
        panelSizes={currentPanelSizes}
        onPanelSizesChange={setPanelSizes}
      />
    </div>
  );
}
