import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "@emotion/css";
import {
  clampToExtent,
  DEFAULT_COLOR_STYLE,
  detectSequenceType,
  GAP_COLOR,
  moveItem,
  ResizeHandle,
  resolveRowOrder,
  ROOT_CLASS,
  RowLabels,
  useDarkMode,
  useViewport,
  useWheelZoom,
  ViewportToolbar,
  type RowReorderPreview,
  type Viewport,
} from "@react-bio-viz/core";

import { AlignmentCanvas } from "./components/AlignmentCanvas";
import { CursorPositionBadge } from "./components/CursorPositionBadge";
import { CursorTooltip } from "./components/CursorTooltip";
import { Minimap } from "./components/Minimap";
import { OverlayCanvas } from "./components/OverlayCanvas";
import { Scalebar } from "./components/Scalebar";
import { TrackCanvas } from "./components/TrackCanvas";
import {
  BADGE_HEIGHT,
  CELL_SIZE,
  CONSENSUS_LABEL,
  DIVIDER_SIZE,
  HIGHLIGHT_MATCH_COLOR,
  MAX_CELL_SIZE,
  PANEL_LIMITS,
  SCALEBAR_HEIGHT,
  TOOLBAR_HEIGHT,
} from "./constants";
import { useAlignmentGestures, type GridCell, type GridSelectGesture } from "./hooks/useAlignmentGestures";
import { defaultPanelSizes, useMSASelection, usePanelSizes, useRowOrder } from "./hooks/useMSAState";
import type { MSADrawOptions, MSAHover, MSASelection, MSATrack, MultipleSequenceAlignmentProps } from "./types";
import { buildColorIndex } from "./utils/colorIndex";
import { cellColor, type ColorStyle, type ColumnColorContext } from "./utils/colorStyle";
import { computeHighlightMask } from "./utils/highlight";
import { analyseColumns, computeColumnStats, computeConsensus, computeConservationScores } from "./utils/msaAnalysis";
import { applySelectionMode, EMPTY_SELECTION, indexRange, pruneSelection } from "./utils/selection";

export type {
  AlignedSequences,
  MSADrawOptions,
  MSAHover,
  MSAPanelSizes,
  MSASelection,
  MSATrack,
  MultipleSequenceAlignmentProps,
  Sequence,
} from "./types";
export type { ColorStyle, ColumnColorStyle, ScoreColorStyle } from "./utils/colorStyle";
export { COLOR_STYLES, COLOR_STYLE_GROUPS } from "./utils/colorStyle";
export type { ColumnAnalysis, ColumnStat } from "./utils/msaAnalysis";
export { analyseColumns, computeColumnStats, computeConsensus, computeConservationScores } from "./utils/msaAnalysis";

const LETTER_COLOR = { light: "#1a1a1a", dark: "#e8e8e8" } as const;
const CONSENSUS_ROWS = [0];

/** Stable identity of `msa[index]` — see `id` on {@link Sequence}. */
function rowIdOf(sequence: { header: string; id?: string }): string {
  return sequence.id ?? sequence.header;
}

function trackLabel(track: MSATrack): string {
  if (track === "conservation") return "Conservation";
  if (track === "logo") return "Logo";
  return track.label;
}

function trackKey(track: MSATrack, index: number): string {
  return typeof track === "string" ? track : (track.id ?? `${track.label}-${index}`);
}

/**
 * @public
 * Renders a multiple sequence alignment: a canvas that draws only the visible window (so there is
 * no size limit, and letters stay crisp at any zoom), with a sequence-name column, a consensus row,
 * a column ruler, an interactive minimap, optional tracks (conservation, sequence logo, or any
 * per-column score), residue search highlighting, and a hover tooltip/position badge.
 *
 * Interaction: scroll to pan, Ctrl/⌘-scroll or pinch to zoom, drag to pan; Shift-drag adds to the
 * selection and Cmd/Ctrl-drag toggles it (or plain drag, in `"select"` mode); click a track to
 * select columns and a label to select rows; drag labels to reorder rows; Delete/Backspace removes
 * the selection and Escape clears it.
 *
 * Every piece of interactive state is controllable like every other stateful prop in this library
 * — `viewport`, `selection`, `rowOrder` and `panelSizes`, each with its `default*`/`on*Change`/
 * `*Store` companions (see the `bio-viz-conventions` project skill). The alignment itself is never
 * mutated: renames and removals are reported through `onRenameRow`/`onRemoveRows`/
 * `onRemoveColumns` for the caller to apply, which keeps undo/redo and edit logs in the caller's hands.
 */
export function MultipleSequenceAlignment({
  msa,
  width = 650,
  height = 400,
  options,
  viewport,
  defaultViewport,
  onViewportChange,
  viewportStore,
  selection: selectionProp,
  defaultSelection,
  onSelectionChange,
  selectionStore,
  rowOrder: rowOrderProp,
  defaultRowOrder,
  onRowOrderChange,
  rowOrderStore,
  panelSizes: panelSizesProp,
  defaultPanelSizes: defaultPanelSizesProp,
  onPanelSizesChange,
  panelSizesStore,
  onRenameRow,
  onRemoveRows,
  onRemoveColumns,
  onHoverChange,
}: MultipleSequenceAlignmentProps): React.JSX.Element {
  const systemDarkMode = useDarkMode();
  const {
    cellSize = CELL_SIZE,
    colorStyle,
    showLetters = true,
    showLabels = true,
    showConsensus = true,
    showMinimap = true,
    showScalebar = true,
    showToolbar = true,
    showCursorBadge = true,
    showCursorTooltip = true,
    highlightPattern,
    highlightUseRegex = false,
    showOnlyDifferences = false,
    conservationThreshold = 0.9,
    columnScores,
    cellScores,
    tracks = [],
    interactionMode = "pan",
    selectionAxis = "columns",
    zoomAxes = "both",
    reorderableRows = true,
    darkMode = systemDarkMode,
    labelWidth: legacyLabelWidth,
  }: MSADrawOptions = options ?? {};

  const numColumns = msa[0]?.sequence.length ?? 0;
  const numSeqs = msa.length;
  const sequences = useMemo(() => msa.map((s) => s.sequence), [msa]);
  const rowIds = useMemo(() => msa.map(rowIdOf), [msa]);

  // ---- controllable state ------------------------------------------------------------------
  const [selection, setSelection] = useMSASelection({
    selection: selectionProp,
    defaultSelection,
    onSelectionChange,
    selectionStore,
  });
  const [rowOrder, setRowOrder] = useRowOrder({ rowOrder: rowOrderProp, defaultRowOrder, onRowOrderChange, rowOrderStore });
  const seededPanelSizes = useMemo(
    () => defaultPanelSizes(defaultPanelSizesProp, legacyLabelWidth),
    // Seeds only matter on mount, like every `default*` prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [panelSizes, setPanelSizes] = usePanelSizes({
    panelSizes: panelSizesProp,
    defaultPanelSizes: seededPanelSizes,
    onPanelSizesChange,
    panelSizesStore,
  });

  // ---- analysis & colour -------------------------------------------------------------------
  const columnStats = useMemo(() => computeColumnStats(msa), [msa]);
  const analysis = useMemo(() => analyseColumns(msa), [msa]);
  const consensus = useMemo(() => computeConsensus(msa, columnStats), [msa, columnStats]);
  const sequenceType = useMemo(() => detectSequenceType(msa), [msa]);
  const effectiveColorStyle: ColorStyle = colorStyle ?? DEFAULT_COLOR_STYLE[sequenceType];
  const colorContext: ColumnColorContext = useMemo(
    () => ({ analysis, columnStats, conservationThreshold, columnScores, cellScores }),
    [analysis, columnStats, conservationThreshold, columnScores, cellScores]
  );

  const colorIndex = useMemo(() => {
    const dim = darkMode ? GAP_COLOR.dark : GAP_COLOR.light;
    const masks = highlightPattern
      ? sequences.map((sequence) => computeHighlightMask(sequence, highlightPattern, highlightUseRegex))
      : null;
    return buildColorIndex(sequences, (char, row, col) => {
      if (masks) return masks[row][col] ? HIGHLIGHT_MATCH_COLOR : dim;
      return cellColor(char, col, effectiveColorStyle, colorContext, darkMode, row);
    });
  }, [sequences, effectiveColorStyle, colorContext, darkMode, highlightPattern, highlightUseRegex]);

  const consensusColorIndex = useMemo(
    () => buildColorIndex([consensus.sequence], (char, _row, col) => cellColor(char, col, effectiveColorStyle, colorContext, darkMode, -1)),
    [consensus, effectiveColorStyle, colorContext, darkMode]
  );

  // ---- row order ---------------------------------------------------------------------------
  const displayRows = useMemo(() => resolveRowOrder(rowIds, rowOrder), [rowIds, rowOrder]);
  const [reorderPreview, setReorderPreview] = useState<RowReorderPreview | null>(null);
  const renderedRows = useMemo(
    () => (reorderPreview ? moveItem(displayRows, reorderPreview.from, reorderPreview.to) : displayRows),
    [displayRows, reorderPreview]
  );
  const displayIndexById = useMemo(() => {
    const map = new Map<string, number>();
    displayRows.forEach((msaIndex, displayIndex) => map.set(rowIds[msaIndex], displayIndex));
    return map;
  }, [displayRows, rowIds]);

  // ---- layout ------------------------------------------------------------------------------
  const hasLabelColumn = showLabels;
  const labelSpace = hasLabelColumn ? panelSizes.labelWidth + DIVIDER_SIZE : 0;
  const mainWidth = Math.max(cellSize, width - labelSpace);
  const minimapBlock = showMinimap ? panelSizes.minimapHeight + DIVIDER_SIZE : 0;
  const tracksBlock = tracks.length > 0 ? DIVIDER_SIZE + tracks.length * panelSizes.trackHeight : 0;
  const consensusHeight = showConsensus ? cellSize : 0;
  // `height` is a maximum: an alignment with few rows takes only the height its rows need at the
  // default cell size, rather than leaving an empty canvas above the tracks.
  const mainHeight = Math.max(
    cellSize,
    Math.min(
      numSeqs * cellSize,
      height -
        (showToolbar ? TOOLBAR_HEIGHT : 0) -
        (showCursorBadge ? BADGE_HEIGHT : 0) -
        minimapBlock -
        (showScalebar ? SCALEBAR_HEIGHT : 0) -
        consensusHeight -
        tracksBlock
    )
  );

  // ---- viewport ----------------------------------------------------------------------------
  // The pannable extent is the alignment, or the canvas at the default cell size if that's larger:
  // a small alignment is drawn at a normal scale with blank space beyond it, instead of having its
  // few rows stretched to fill the canvas (a viewport can't be wider than its extent).
  const extent = useMemo(
    () => ({
      xMin: 0,
      xMax: Math.max(1, numColumns, mainWidth / cellSize),
      yMin: 0,
      yMax: Math.max(1, numSeqs, mainHeight / cellSize),
    }),
    [numColumns, numSeqs, mainWidth, mainHeight, cellSize]
  );
  const initialViewport = useMemo(
    () =>
      clampToExtent({ x0: 0, x1: mainWidth / cellSize, y0: 0, y1: mainHeight / cellSize, ...extent }),
    // Only the first render's value is used (it seeds uncontrolled state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const {
    viewport: currentViewport,
    setViewport,
    panBy,
    zoomAt,
  } = useViewport({ extent, viewport, defaultViewport: defaultViewport ?? initialViewport, onViewportChange, viewportStore });

  // The alignment was edited (rows/columns removed): keep the window inside the new extent.
  useEffect(() => {
    if (currentViewport.xMax !== extent.xMax || currentViewport.yMax !== extent.yMax) {
      setViewport((prev) => clampToExtent({ ...prev, ...extent }));
    }
  }, [extent, currentViewport.xMax, currentViewport.yMax, setViewport]);

  // The canvas was resized (widget size, a panel divider): keep cells the same size on screen and
  // show more or fewer of them, rather than stretching the same window over the new area.
  const lastSizeRef = useRef({ width: mainWidth, height: mainHeight });
  useEffect(() => {
    const last = lastSizeRef.current;
    if (last.width === mainWidth && last.height === mainHeight) return;
    lastSizeRef.current = { width: mainWidth, height: mainHeight };
    setViewport((prev) =>
      clampToExtent({
        ...prev,
        x1: prev.x0 + ((prev.x1 - prev.x0) * mainWidth) / last.width,
        y1: prev.y0 + ((prev.y1 - prev.y0) * mainHeight) / last.height,
      })
    );
  }, [mainWidth, mainHeight, setViewport]);

  const spanX = currentViewport.x1 - currentViewport.x0;
  const spanY = currentViewport.y1 - currentViewport.y0;
  const cellW = mainWidth / spanX;
  const cellH = mainHeight / spanY;

  const zoomColumnsOnly = zoomAxes === "columns";
  // Zooming in stops at MAX_CELL_SIZE px per cell: beyond that nothing new becomes readable.
  const limitZoomIn = useCallback(
    (factor: number, span: number, pixels: number) => Math.max(factor, pixels / MAX_CELL_SIZE / span),
    []
  );
  const zoomToolbar = useCallback(
    (factor: number) =>
      setViewport((prev) =>
        clampToExtent(
          (() => {
            const cx = (prev.x0 + prev.x1) / 2;
            const cy = (prev.y0 + prev.y1) / 2;
            const fx = limitZoomIn(factor, prev.x1 - prev.x0, mainWidth);
            const fy = zoomColumnsOnly ? 1 : limitZoomIn(factor, prev.y1 - prev.y0, mainHeight);
            return {
              ...prev,
              x0: cx - ((prev.x1 - prev.x0) * fx) / 2,
              x1: cx + ((prev.x1 - prev.x0) * fx) / 2,
              y0: cy - ((prev.y1 - prev.y0) * fy) / 2,
              y1: cy + ((prev.y1 - prev.y0) * fy) / 2,
            };
          })()
        )
      ),
    [setViewport, zoomColumnsOnly, limitZoomIn, mainWidth, mainHeight]
  );
  const resetView = useCallback(
    () => setViewport((prev) => clampToExtent({ ...prev, x0: 0, x1: mainWidth / cellSize, y0: 0, y1: mainHeight / cellSize })),
    [setViewport, mainWidth, mainHeight, cellSize]
  );

  const panByPixels = useCallback(
    (dx: number, dy: number) => panBy(dx / cellW, dy / cellH),
    [panBy, cellW, cellH]
  );

  const wheel = useWheelZoom({
    onPan: panByPixels,
    onZoom: (point, factor, event) =>
      zoomAt(
        point,
        limitZoomIn(factor, spanX, mainWidth),
        zoomColumnsOnly || event.altKey ? 1 : limitZoomIn(factor, spanY, mainHeight)
      ),
    toDataPoint: (x, y) => ({ x: currentViewport.x0 + x / cellW, y: currentViewport.y0 + y / cellH }),
  });

  // ---- hover -------------------------------------------------------------------------------
  const [hover, setHover] = useState<MSAHover | null>(null);
  const [labelHoverRow, setLabelHoverRow] = useState<number | null>(null);
  const [trackHoverCol, setTrackHoverCol] = useState<number | null>(null);
  const onHoverChangeRef = useRef(onHoverChange);
  onHoverChangeRef.current = onHoverChange;
  const updateHover = useCallback((next: MSAHover | null) => {
    setHover(next);
    onHoverChangeRef.current?.(next);
  }, []);

  const toCell = useCallback(
    (x: number, y: number): GridCell => ({
      col: Math.max(0, Math.min(numColumns - 1, Math.floor(currentViewport.x0 + x / cellW))),
      row: Math.max(0, Math.min(numSeqs - 1, Math.floor(currentViewport.y0 + y / cellH))),
    }),
    [currentViewport.x0, currentViewport.y0, cellW, cellH, numColumns, numSeqs]
  );

  const hoverAlignment = useCallback(
    (position: { x: number; y: number; clientX: number; clientY: number } | null) => {
      if (!position) return updateHover(null);
      const col = Math.floor(currentViewport.x0 + position.x / cellW);
      const row = Math.floor(currentViewport.y0 + position.y / cellH);
      if (col < 0 || col >= numColumns || row < 0 || row >= numSeqs) return updateHover(null);
      const msaIndex = renderedRows[row];
      updateHover({
        row,
        rowId: rowIds[msaIndex],
        label: msa[msaIndex].header,
        col,
        residue: sequences[msaIndex][col] ?? "",
        clientX: position.clientX,
        clientY: position.clientY,
      });
    },
    [currentViewport.x0, currentViewport.y0, cellW, cellH, numColumns, numSeqs, renderedRows, rowIds, msa, sequences, updateHover]
  );

  const hoverConsensus = useCallback(
    (event: React.PointerEvent<HTMLElement> | null) => {
      if (!event) return updateHover(null);
      const rect = event.currentTarget.getBoundingClientRect();
      const col = Math.floor(currentViewport.x0 + (event.clientX - rect.left) / cellW);
      if (col < 0 || col >= numColumns) return updateHover(null);
      updateHover({
        row: null,
        rowId: null,
        label: CONSENSUS_LABEL,
        col,
        residue: consensus.sequence[col] ?? "",
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    [currentViewport.x0, cellW, numColumns, consensus, updateHover]
  );

  // ---- selection ---------------------------------------------------------------------------
  // Keep the selection inside the alignment after rows/columns are removed.
  useEffect(() => {
    const pruned = pruneSelection(selection, new Set(rowIds), numColumns);
    if (pruned !== selection) setSelection(pruned);
  }, [rowIds, numColumns, selection, setSelection]);

  // Shift-click extends from the last clicked row/column; ephemeral, so not part of `selection`.
  const anchorRef = useRef<{ row: number | null; col: number | null }>({ row: null, col: null });

  const selectRows = useCallback(
    (fromRow: number, toRow: number, mode: GridSelectGesture["mode"], extend: boolean) => {
      const anchor = anchorRef.current.row;
      const range = extend && anchor !== null ? indexRange(anchor, toRow) : indexRange(fromRow, toRow);
      const ids = range.map((row) => rowIds[displayRows[row]]).filter((id) => id !== undefined);
      anchorRef.current.row = toRow;
      setSelection((prev: MSASelection) => ({ ...prev, rows: applySelectionMode(prev.rows, ids, extend ? "additive" : mode) }));
    },
    [rowIds, displayRows, setSelection]
  );

  const selectColumns = useCallback(
    (fromCol: number, toCol: number, mode: GridSelectGesture["mode"], extend: boolean) => {
      const anchor = anchorRef.current.col;
      const range = extend && anchor !== null ? indexRange(anchor, toCol) : indexRange(fromCol, toCol);
      anchorRef.current.col = toCol;
      setSelection((prev: MSASelection) => ({
        ...prev,
        columns: applySelectionMode(prev.columns, range, extend ? "additive" : mode),
      }));
    },
    [setSelection]
  );

  const onGridSelect = useCallback(
    ({ from, to, mode, isClick, shiftKey }: GridSelectGesture) => {
      const extend = isClick && shiftKey;
      if (selectionAxis === "rows") selectRows(from.row, to.row, mode, extend);
      else selectColumns(from.col, to.col, mode, extend);
    },
    [selectionAxis, selectRows, selectColumns]
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const focusRoot = useCallback(() => rootRef.current?.focus({ preventScroll: true }), []);

  const gestures = useAlignmentGestures({
    interactionMode,
    toCell,
    panByPixels,
    onSelect: onGridSelect,
    onHover: hoverAlignment,
    onPressStart: focusRoot,
  });

  const selectedDisplayRows = useMemo(
    () => selection.rows.map((id) => displayIndexById.get(id)).filter((row): row is number => row !== undefined),
    [selection.rows, displayIndexById]
  );
  const selectedRowIds = useMemo(() => new Set(selection.rows), [selection.rows]);

  // ---- editing -----------------------------------------------------------------------------
  const removeSelection = useCallback(() => {
    const rows = selection.rows.filter((id) => displayIndexById.has(id));
    const columns = selection.columns.filter((col) => col >= 0 && col < numColumns);
    let removed = false;
    // Never empty the alignment: a removal covering every row (or column) is ignored.
    if (onRemoveRows && rows.length > 0 && rows.length < numSeqs) {
      onRemoveRows(rows);
      removed = true;
    }
    if (onRemoveColumns && columns.length > 0 && columns.length < numColumns) {
      onRemoveColumns([...columns].sort((a, b) => a - b));
      removed = true;
    }
    if (removed) setSelection(EMPTY_SELECTION);
  }, [selection, displayIndexById, numColumns, numSeqs, onRemoveRows, onRemoveColumns, setSelection]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelection();
      } else if (event.key === "Escape") {
        setSelection(EMPTY_SELECTION);
      }
    },
    [removeSelection, setSelection]
  );

  const labelRows = useMemo(
    () => displayRows.map((msaIndex) => ({ id: rowIds[msaIndex], label: msa[msaIndex].header })),
    [displayRows, rowIds, msa]
  );

  const commitReorder = useCallback(
    (from: number, to: number) => setRowOrder(moveItem(displayRows.map((index) => rowIds[index]), from, to)),
    [displayRows, rowIds, setRowOrder]
  );

  const removeOneRow = useMemo(
    () => (onRemoveRows && numSeqs > 1 ? (id: string) => onRemoveRows([id]) : undefined),
    [onRemoveRows, numSeqs]
  );

  // ---- tracks ------------------------------------------------------------------------------
  const conservationScores = useMemo(() => computeConservationScores(columnStats), [columnStats]);
  const logoLetterColor = useCallback(
    (char: string, col: number) => cellColor(char, col, effectiveColorStyle, colorContext, darkMode),
    [effectiveColorStyle, colorContext, darkMode]
  );
  const onTrackColumnClick = useCallback(
    (col: number, event: React.MouseEvent) => {
      focusRoot();
      const mode = event.metaKey || event.ctrlKey ? "toggle" : "replace";
      selectColumns(col, col, mode, event.shiftKey);
    },
    [focusRoot, selectColumns]
  );

  const setPanel = useCallback(
    (key: keyof typeof PANEL_LIMITS) => (size: number) =>
      setPanelSizes((prev) => ({ ...prev, [key]: Math.round(size) })),
    [setPanelSizes]
  );

  const letterColor = darkMode ? LETTER_COLOR.dark : LETTER_COLOR.light;
  const mainWindow = { x0: currentViewport.x0, x1: currentViewport.x1, y0: currentViewport.y0, y1: currentViewport.y1 };
  const hoverRow = hover?.row ?? labelHoverRow;
  const hoverCol = hover?.col ?? trackHoverCol;
  const labelFontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cx(ROOT_CLASS, "text-foreground", css({ display: "flex", flexDirection: "column", width, outline: "none" }))}
    >
      {showToolbar && (
        <div style={{ height: TOOLBAR_HEIGHT }}>
          <ViewportToolbar
            viewport={currentViewport}
            panBy={panBy}
            zoomBy={zoomToolbar}
            reset={resetView}
            axes="both"
          />
        </div>
      )}
      {showCursorBadge && (
        <div style={{ height: BADGE_HEIGHT }}>
          <CursorPositionBadge hover={hover} />
        </div>
      )}

      {showMinimap && (
        <>
          <div className={css({ display: "flex" })} style={{ marginLeft: labelSpace }}>
            <Minimap
              colorIndex={colorIndex}
              rowOrder={renderedRows}
              sequences={sequences}
              numColumns={numColumns}
              numSeqs={numSeqs}
              pixelWidth={mainWidth}
              pixelHeight={panelSizes.minimapHeight}
              viewport={currentViewport}
              setViewport={setViewport as (next: Viewport | ((prev: Viewport) => Viewport)) => void}
              panBy={panBy}
            />
          </div>
          <ResizeHandle
            orientation="horizontal"
            size={panelSizes.minimapHeight}
            onResize={setPanel("minimapHeight")}
            min={PANEL_LIMITS.minimapHeight.min}
            max={PANEL_LIMITS.minimapHeight.max}
            thickness={DIVIDER_SIZE}
            aria-label="Resize minimap"
          />
        </>
      )}

      {showScalebar && (
        <div className={css({ display: "flex" })} style={{ marginLeft: labelSpace }}>
          <Scalebar
            width={mainWidth}
            columnCount={numColumns}
            x0={currentViewport.x0}
            pixelsPerColumn={cellW}
            hoverCol={hoverCol}
          />
        </div>
      )}

      {showConsensus && (
        <div className={css({ display: "flex" })} style={{ height: consensusHeight }}>
          {hasLabelColumn && (
            <div
              className="shrink-0 overflow-hidden font-bold whitespace-nowrap"
              style={{ width: labelSpace, paddingLeft: 4, fontSize: Math.min(12, cellSize * 0.75), lineHeight: `${consensusHeight}px`, fontFamily: labelFontFamily }}
            >
              {CONSENSUS_LABEL}
            </div>
          )}
          <div onPointerMove={hoverConsensus} onPointerLeave={() => hoverConsensus(null)}>
            <AlignmentCanvas
              colorIndex={consensusColorIndex}
              rowOrder={CONSENSUS_ROWS}
              sequences={[consensus.sequence]}
              window={{ x0: currentViewport.x0, x1: currentViewport.x1, y0: 0, y1: 1 }}
              width={mainWidth}
              height={consensusHeight}
              showLetters={showLetters}
              letterColor={letterColor}
              className="consensus"
            />
          </div>
        </div>
      )}

      <div className={css({ display: "flex" })} style={{ height: mainHeight }}>
        {hasLabelColumn && (
          <>
            <div style={{ fontFamily: labelFontFamily }}>
              <RowLabels
                rows={labelRows}
                rowHeight={cellH}
                offsetY={-currentViewport.y0 * cellH}
                width={panelSizes.labelWidth}
                height={mainHeight}
                hoverIndex={hover?.row ?? null}
                onHoverIndexChange={setLabelHoverRow}
                selectedIds={selectedRowIds}
                onRowClick={(index, event) => {
                  focusRoot();
                  const mode = event.metaKey || event.ctrlKey ? "toggle" : "replace";
                  selectRows(index, index, mode, event.shiftKey);
                }}
                onRename={onRenameRow}
                onRemove={removeOneRow}
                onReorder={reorderableRows ? commitReorder : undefined}
                onReorderPreview={reorderableRows ? setReorderPreview : undefined}
              />
            </div>
            <ResizeHandle
              orientation="vertical"
              size={panelSizes.labelWidth}
              onResize={setPanel("labelWidth")}
              min={PANEL_LIMITS.labelWidth.min}
              max={Math.min(PANEL_LIMITS.labelWidth.max, width - cellSize)}
              thickness={DIVIDER_SIZE}
              aria-label="Resize labels"
            />
          </>
        )}
        <div className={css({ position: "relative" })} style={{ width: mainWidth, height: mainHeight }}>
          <AlignmentCanvas
            colorIndex={colorIndex}
            rowOrder={renderedRows}
            sequences={sequences}
            window={mainWindow}
            width={mainWidth}
            height={mainHeight}
            showLetters={showLetters}
            letterColor={letterColor}
            reference={showOnlyDifferences ? consensus.sequence : undefined}
            className="alignment"
          />
          <OverlayCanvas
            window={mainWindow}
            width={mainWidth}
            height={mainHeight}
            hoverRow={hoverRow}
            hoverCol={hoverCol}
            selectedDisplayRows={selectedDisplayRows}
            selectedColumns={selection.columns}
            marquee={gestures.marquee}
            darkMode={darkMode}
            dataColumns={numColumns}
            dataRows={numSeqs}
            interaction={{
              ...gestures.handlers,
              ref: wheel.ref,
              style: { cursor: interactionMode === "select" ? "crosshair" : "grab" },
            }}
          />
        </div>
      </div>

      {tracks.length > 0 && (
        <>
          <ResizeHandle
            orientation="horizontal"
            size={panelSizes.trackHeight}
            onResize={setPanel("trackHeight")}
            min={PANEL_LIMITS.trackHeight.min}
            max={PANEL_LIMITS.trackHeight.max}
            thickness={DIVIDER_SIZE}
            aria-label="Resize tracks"
          />
          {tracks.map((track, index) => (
            <div key={trackKey(track, index)} className={css({ display: "flex" })} style={{ height: panelSizes.trackHeight }}>
              {hasLabelColumn && (
                <div
                  className="shrink-0 overflow-hidden text-xs whitespace-nowrap text-muted-foreground"
                  style={{ width: labelSpace, paddingLeft: 4, lineHeight: `${panelSizes.trackHeight}px` }}
                >
                  {trackLabel(track)}
                </div>
              )}
              <TrackCanvas
                kind={track === "logo" ? "logo" : "bars"}
                scores={track === "conservation" ? conservationScores : typeof track === "object" ? track.scores : undefined}
                columnStats={columnStats}
                alphabetSize={sequenceType === "Protein" ? 20 : 4}
                letterColor={logoLetterColor}
                x0={currentViewport.x0}
                x1={currentViewport.x1}
                width={mainWidth}
                height={panelSizes.trackHeight}
                darkMode={darkMode}
                selectedColumns={selection.columns}
                hoverCol={hoverCol}
                onColumnClick={onTrackColumnClick}
                onHoverColChange={setTrackHoverCol}
              />
            </div>
          ))}
        </>
      )}

      {showCursorTooltip && <CursorTooltip hover={hover} />}
    </div>
  );
}
