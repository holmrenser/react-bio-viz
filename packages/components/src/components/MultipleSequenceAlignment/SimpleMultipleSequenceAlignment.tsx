import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampToExtent,
  DEFAULT_COLOR_STYLE,
  detectSequenceType,
  GAP_COLOR,
  limitZoomIn,
  moveItem,
  ResizeHandle,
  resolveRowOrder,
  ROOT_CLASS,
  RowLabels,
  useControllableState,
  useDarkMode,
  useViewport,
  useWheelZoom,
  type RowReorderPreview,
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
  LABEL_FONT_FAMILY,
  LETTER_COLOR,
  MAX_CELL_SIZE,
  NO_ORDER,
  PANEL_LIMITS,
} from "./constants";
import { useAlignmentGestures, type GridCell, type GridSelectGesture } from "./hooks/useAlignmentGestures";
import type { MSADrawOptions, MSAHover, MSATrack, SimpleMultipleSequenceAlignmentProps } from "./types";
import { buildColorIndex } from "./utils/colorIndex";
import { cellColor, type ColorStyle, type ColumnColorContext } from "./utils/colorStyle";
import { computeHighlightMask } from "./utils/highlight";
import { alignmentExtent, computeAlignmentLayout, defaultAlignmentViewport, resolvePanelSizes } from "./utils/layout";
import { analyseColumns, computeColumnStats, computeConsensus, computeConservationScores } from "./utils/msaAnalysis";
import { applySelectionMode, EMPTY_SELECTION, indexRange, pruneSelection } from "./utils/selection";

const CONSENSUS_ROWS = [0];
const DEFAULT_PANEL_SIZES = resolvePanelSizes(undefined);

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
 * @group Components
 * The alignment view inside {@link MultipleSequenceAlignment}, without its toolbar, and controlled:
 * pan/zoom, selection, row drags and panel resizes report through their `on*Change` callbacks, and
 * show once passed back.
 */
export function SimpleMultipleSequenceAlignment({
  msa,
  width = 650,
  height = 400,
  options,
  viewport,
  onViewportChange,
  selection: selectionProp,
  onSelectionChange,
  rowOrder = NO_ORDER,
  onRowOrderChange,
  panelSizes = DEFAULT_PANEL_SIZES,
  onPanelSizesChange,
  onRenameRow,
  onRemoveRows,
  onRemoveColumns,
  onHoverChange,
}: SimpleMultipleSequenceAlignmentProps): React.JSX.Element {
  const systemDarkMode = useDarkMode();
  const drawOptions: MSADrawOptions = options ?? {};
  const {
    cellSize = CELL_SIZE,
    colorStyle,
    showLetters = true,
    showLabels = true,
    showConsensus = true,
    showMinimap = true,
    showScalebar = true,
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
  } = drawOptions;

  const numColumns = msa[0]?.sequence.length ?? 0;
  const numSeqs = msa.length;
  const sequences = useMemo(() => msa.map((s) => s.sequence), [msa]);
  const rowIds = useMemo(() => msa.map(rowIdOf), [msa]);

  const [selection, setSelection] = useControllableState({
    value: selectionProp ?? EMPTY_SELECTION,
    onChange: onSelectionChange,
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

  // ---- layout & viewport -------------------------------------------------------------------
  const layout = useMemo(
    () => computeAlignmentLayout(numSeqs, width, height, drawOptions, panelSizes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [numSeqs, width, height, cellSize, showLabels, showConsensus, showMinimap, showScalebar, showCursorBadge, tracks.length, panelSizes]
  );
  const { labelSpace, mainWidth, mainHeight } = layout;
  const consensusHeight = showConsensus ? cellSize : 0;
  const extent = useMemo(() => alignmentExtent(numColumns, numSeqs, layout, cellSize), [numColumns, numSeqs, layout, cellSize]);
  const isDefaultWindow = viewport === undefined;
  const current = useMemo(
    () => viewport ?? defaultAlignmentViewport(numColumns, numSeqs, layout, cellSize),
    [viewport, numColumns, numSeqs, layout, cellSize]
  );
  const { setViewport, panBy, zoomAt } = useViewport({ extent, viewport: current, onViewportChange });

  // The alignment was edited (rows or columns removed): keep the window inside the new extent.
  useEffect(() => {
    if (current.xMax !== extent.xMax || current.yMax !== extent.yMax) {
      setViewport((prev) => clampToExtent({ ...prev, ...extent }));
    }
  }, [extent, current.xMax, current.yMax, setViewport]);

  // The canvas was resized: keep cells the same size on screen, showing more or fewer of them. The
  // default window already follows the size.
  const lastSizeRef = useRef({ width: mainWidth, height: mainHeight });
  useEffect(() => {
    const last = lastSizeRef.current;
    if (last.width === mainWidth && last.height === mainHeight) return;
    lastSizeRef.current = { width: mainWidth, height: mainHeight };
    if (isDefaultWindow) return;
    setViewport((prev) =>
      clampToExtent({
        ...prev,
        x1: prev.x0 + ((prev.x1 - prev.x0) * mainWidth) / last.width,
        y1: prev.y0 + ((prev.y1 - prev.y0) * mainHeight) / last.height,
      })
    );
  }, [mainWidth, mainHeight, isDefaultWindow, setViewport]);

  const spanX = current.x1 - current.x0;
  const spanY = current.y1 - current.y0;
  const cellW = mainWidth / spanX;
  const cellH = mainHeight / spanY;

  const panByPixels = useCallback((dx: number, dy: number) => panBy(dx / cellW, dy / cellH), [panBy, cellW, cellH]);
  const wheel = useWheelZoom({
    onPan: panByPixels,
    onZoom: (point, factor, event) =>
      zoomAt(
        point,
        limitZoomIn(factor, spanX, mainWidth, MAX_CELL_SIZE),
        zoomAxes === "columns" || event.altKey ? 1 : limitZoomIn(factor, spanY, mainHeight, MAX_CELL_SIZE)
      ),
    toDataPoint: (x, y) => ({ x: current.x0 + x / cellW, y: current.y0 + y / cellH }),
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
      col: Math.max(0, Math.min(numColumns - 1, Math.floor(current.x0 + x / cellW))),
      row: Math.max(0, Math.min(numSeqs - 1, Math.floor(current.y0 + y / cellH))),
    }),
    [current.x0, current.y0, cellW, cellH, numColumns, numSeqs]
  );

  const hoverAlignment = useCallback(
    (position: { x: number; y: number; clientX: number; clientY: number } | null) => {
      if (!position) return updateHover(null);
      const col = Math.floor(current.x0 + position.x / cellW);
      const row = Math.floor(current.y0 + position.y / cellH);
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
    [current.x0, current.y0, cellW, cellH, numColumns, numSeqs, renderedRows, rowIds, msa, sequences, updateHover]
  );

  const hoverConsensus = useCallback(
    (event: React.PointerEvent<HTMLElement> | null) => {
      if (!event) return updateHover(null);
      const rect = event.currentTarget.getBoundingClientRect();
      const col = Math.floor(current.x0 + (event.clientX - rect.left) / cellW);
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
    [current.x0, cellW, numColumns, consensus, updateHover]
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
      setSelection((prev) => ({ ...prev, rows: applySelectionMode(prev.rows, ids, extend ? "additive" : mode) }));
    },
    [rowIds, displayRows, setSelection]
  );

  const selectColumns = useCallback(
    (fromCol: number, toCol: number, mode: GridSelectGesture["mode"], extend: boolean) => {
      const anchor = anchorRef.current.col;
      const range = extend && anchor !== null ? indexRange(anchor, toCol) : indexRange(fromCol, toCol);
      anchorRef.current.col = toCol;
      setSelection((prev) => ({ ...prev, columns: applySelectionMode(prev.columns, range, extend ? "additive" : mode) }));
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
    (from: number, to: number) => onRowOrderChange?.(moveItem(displayRows.map((index) => rowIds[index]), from, to)),
    [displayRows, rowIds, onRowOrderChange]
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

  const resizePanel = (key: keyof typeof PANEL_LIMITS) => (size: number) =>
    onPanelSizesChange?.({ ...panelSizes, [key]: Math.round(size) });

  const letterColor = darkMode ? LETTER_COLOR.dark : LETTER_COLOR.light;
  const mainWindow = { x0: current.x0, x1: current.x1, y0: current.y0, y1: current.y1 };
  const hoverRow = hover?.row ?? labelHoverRow;
  const hoverCol = hover?.col ?? trackHoverCol;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={`${ROOT_CLASS} flex flex-col text-foreground outline-none`}
      style={{ width }}
    >
      {showCursorBadge && (
        <div style={{ height: BADGE_HEIGHT }}>
          <CursorPositionBadge hover={hover} />
        </div>
      )}

      {showMinimap && (
        <>
          <div className="flex" style={{ marginLeft: labelSpace }}>
            <Minimap
              colorIndex={colorIndex}
              rowOrder={renderedRows}
              sequences={sequences}
              numColumns={numColumns}
              numSeqs={numSeqs}
              pixelWidth={mainWidth}
              pixelHeight={panelSizes.minimapHeight}
              viewport={current}
              setViewport={setViewport}
              panBy={panBy}
            />
          </div>
          <ResizeHandle
            orientation="horizontal"
            size={panelSizes.minimapHeight}
            onResize={resizePanel("minimapHeight")}
            min={PANEL_LIMITS.minimapHeight.min}
            max={PANEL_LIMITS.minimapHeight.max}
            thickness={DIVIDER_SIZE}
            aria-label="Resize minimap"
          />
        </>
      )}

      {showScalebar && (
        <div className="flex" style={{ marginLeft: labelSpace }}>
          <Scalebar width={mainWidth} columnCount={numColumns} x0={current.x0} pixelsPerColumn={cellW} hoverCol={hoverCol} />
        </div>
      )}

      {showConsensus && (
        <div className="flex" style={{ height: consensusHeight }}>
          {showLabels && (
            <div
              className="shrink-0 overflow-hidden font-bold whitespace-nowrap"
              style={{
                width: labelSpace,
                paddingLeft: 4,
                fontSize: Math.min(12, cellSize * 0.75),
                lineHeight: `${consensusHeight}px`,
                fontFamily: LABEL_FONT_FAMILY,
              }}
            >
              {CONSENSUS_LABEL}
            </div>
          )}
          <div onPointerMove={hoverConsensus} onPointerLeave={() => hoverConsensus(null)}>
            <AlignmentCanvas
              colorIndex={consensusColorIndex}
              rowOrder={CONSENSUS_ROWS}
              sequences={[consensus.sequence]}
              window={{ x0: current.x0, x1: current.x1, y0: 0, y1: 1 }}
              width={mainWidth}
              height={consensusHeight}
              showLetters={showLetters}
              letterColor={letterColor}
              className="consensus"
            />
          </div>
        </div>
      )}

      <div className="flex" style={{ height: mainHeight }}>
        {showLabels && (
          <>
            <div style={{ fontFamily: LABEL_FONT_FAMILY }}>
              <RowLabels
                rows={labelRows}
                rowHeight={cellH}
                offsetY={-current.y0 * cellH}
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
              onResize={resizePanel("labelWidth")}
              min={PANEL_LIMITS.labelWidth.min}
              max={Math.min(PANEL_LIMITS.labelWidth.max, width - cellSize)}
              thickness={DIVIDER_SIZE}
              aria-label="Resize labels"
            />
          </>
        )}
        <div className="relative" style={{ width: mainWidth, height: mainHeight }}>
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
            onResize={resizePanel("trackHeight")}
            min={PANEL_LIMITS.trackHeight.min}
            max={PANEL_LIMITS.trackHeight.max}
            thickness={DIVIDER_SIZE}
            aria-label="Resize tracks"
          />
          {tracks.map((track, index) => (
            <div key={trackKey(track, index)} className="flex" style={{ height: panelSizes.trackHeight }}>
              {showLabels && (
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
                x0={current.x0}
                x1={current.x1}
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
