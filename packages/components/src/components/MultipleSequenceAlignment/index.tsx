import { useCallback, useMemo, useRef, useState } from "react";
import { css, cx } from "@emotion/css";
import {
  DEFAULT_COLOR_STYLE,
  detectSequenceType,
  useDarkMode,
  useDragPan,
  useViewport,
  useWheelZoom,
  ViewportToolbar,
} from "@react-bio-viz/core";

import { AlignmentCanvas } from "./components/AlignmentCanvas";
import { CursorPositionBadge } from "./components/CursorPositionBadge";
import { CursorTooltip, type HoverCell } from "./components/CursorTooltip";
import { Minimap } from "./components/Minimap";
import { MSALabels } from "./components/MSALabels";
import { OffscreenCanvas } from "./components/OffscreenCanvas";
import { Scalebar } from "./components/Scalebar";
import { CELL_SIZE, LABEL_WIDTH, MINIMAP_HEIGHT, SCALEBAR_HEIGHT } from "./constants";
import type { MSADrawOptions, MultipleSequenceAlignmentProps } from "./types";
import type { ColorStyle, ColumnColorContext } from "./utils/colorStyle";
import { analyseColumns, computeColumnStats, computeConsensus } from "./utils/msaAnalysis";

export type { AlignedSequences, MSADrawOptions, MultipleSequenceAlignmentProps, Sequence } from "./types";
export type { HoverCell } from "./components/CursorTooltip";
export type { ColorStyle, ColumnColorStyle } from "./utils/colorStyle";
export { COLOR_STYLES, COLOR_STYLE_GROUPS } from "./utils/colorStyle";
export type { ColumnAnalysis, ColumnStat } from "./utils/msaAnalysis";

type ResolvedMSAOptions = Required<Omit<MSADrawOptions, "colorStyle" | "highlightPattern">> & {
  colorStyle: ColorStyle | undefined;
  highlightPattern: string | undefined;
};

const DEFAULT_OPTIONS: Omit<ResolvedMSAOptions, "darkMode"> = {
  cellSize: CELL_SIZE,
  colorStyle: undefined,
  showLetters: true,
  showLabels: true,
  labelWidth: LABEL_WIDTH,
  showConsensus: true,
  showMinimap: true,
  showScalebar: true,
  highlightPattern: undefined,
  highlightUseRegex: false,
  showOnlyDifferences: false,
  conservationThreshold: 0.9,
};

/**
 * @public
 * Renders a multiple sequence alignment as a dual-canvas viewport (an off-screen full-resolution
 * source image, cropped/scaled on-screen for the visible window) with drag-to-pan,
 * wheel-to-zoom, a pan/zoom toolbar, a column ruler, an interactive minimap, an optional consensus
 * row, residue search highlighting, and a hover tooltip/position badge.
 *
 * Colors come from the shared scheme set (ClustalX/Zappo/Taylor for protein, two nucleotide
 * schemes) plus column-analysis styles; the default is picked from the alignment's own alphabet.
 *
 * Pan/zoom is controllable like every other stateful prop in this library — see `viewport`/
 * `defaultViewport`/`onViewportChange`/`viewportStore` and the `bio-viz-conventions` project skill.
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
}: MultipleSequenceAlignmentProps): React.JSX.Element {
  const systemDarkMode = useDarkMode();
  const {
    cellSize,
    colorStyle,
    showLetters,
    showLabels,
    labelWidth,
    showConsensus,
    showMinimap,
    showScalebar,
    highlightPattern,
    highlightUseRegex,
    showOnlyDifferences,
    conservationThreshold,
    darkMode,
  } = { ...DEFAULT_OPTIONS, darkMode: systemDarkMode, ...options };

  const numColumns = msa[0]?.sequence.length ?? 0;
  const numSeqs = msa.length;

  const columnStats = useMemo(() => computeColumnStats(msa), [msa]);
  const analysis = useMemo(() => analyseColumns(msa), [msa]);
  const consensusSequence = useMemo(() => computeConsensus(msa, columnStats), [msa, columnStats]);
  const colorContext: ColumnColorContext = useMemo(
    () => ({ analysis, columnStats, conservationThreshold }),
    [analysis, columnStats, conservationThreshold]
  );
  // Default the scheme to whichever alphabet the alignment looks like, rather than forcing the
  // caller to know — matching acacia's `detectSequenceType` + `DEFAULT_COLOR_SCHEME` pairing.
  const effectiveColorStyle: ColorStyle = useMemo(
    () => colorStyle ?? DEFAULT_COLOR_STYLE[detectSequenceType(msa)],
    [colorStyle, msa]
  );

  const labelSpace = showLabels ? labelWidth : 0;
  const minimapHeight = showMinimap ? MINIMAP_HEIGHT : 0;
  const scalebarHeight = showScalebar ? SCALEBAR_HEIGHT : 0;
  const consensusHeight = showConsensus ? cellSize : 0;
  const mainWidth = Math.max(cellSize, width - labelSpace);
  const mainHeight = Math.max(
    cellSize,
    height - minimapHeight - scalebarHeight - consensusHeight - (showMinimap ? cellSize : 0) - (showConsensus ? cellSize : 0)
  );

  const extent = useMemo(() => ({ xMin: 0, xMax: numColumns, yMin: 0, yMax: numSeqs }), [numColumns, numSeqs]);

  const computedDefaultViewport = useMemo(() => {
    const visibleCols = Math.max(1, Math.min(numColumns, Math.floor(mainWidth / cellSize)));
    const visibleRows = Math.max(1, Math.min(numSeqs, Math.floor(mainHeight / cellSize)));
    return { x0: 0, x1: visibleCols, y0: 0, y1: visibleRows, ...extent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numColumns, numSeqs, mainWidth, mainHeight, cellSize]);

  const {
    viewport: currentViewport,
    setViewport,
    panBy,
    zoomBy,
    zoomAt,
    reset,
  } = useViewport({
    extent,
    viewport,
    defaultViewport: defaultViewport ?? computedDefaultViewport,
    onViewportChange,
    viewportStore,
  });

  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const consensusOffscreenCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fresh identity exactly when the offscreen canvases repaint, so the on-screen crops know to
  // re-copy — see `AlignmentCanvas`'s `sourceRevision`. Deps mirror `OffscreenCanvas`'s effect.
  const sourceRevision = useMemo(
    () => ({}),
    [
      msa,
      effectiveColorStyle,
      colorContext,
      darkMode,
      showLetters,
      cellSize,
      highlightPattern,
      highlightUseRegex,
      showOnlyDifferences,
      consensusSequence,
    ]
  );

  const spanX = currentViewport.x1 - currentViewport.x0;
  const spanY = currentViewport.y1 - currentViewport.y0;
  const pixelsPerColumn = spanX > 0 ? mainWidth / spanX : cellSize;

  const dragHandlers = useDragPan({
    onPan: (dx, dy) => panBy(dx, dy),
    scaleX: mainWidth > 0 ? spanX / mainWidth : 0,
    scaleY: mainHeight > 0 ? spanY / mainHeight : 0,
  });

  const wheelHandlers = useWheelZoom({
    onZoom: (point, factor) => zoomAt(point, factor),
    toDataPoint: (pixelX, pixelY) => ({
      x: currentViewport.x0 + (mainWidth > 0 ? (pixelX / mainWidth) * spanX : 0),
      y: currentViewport.y0 + (mainHeight > 0 ? (pixelY / mainHeight) * spanY : 0),
    }),
  });

  const [hover, setHover] = useState<HoverCell | null>(null);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      dragHandlers.onPointerMove(event);
      const rect = event.currentTarget.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const col = Math.floor(currentViewport.x0 + (mainWidth > 0 ? (localX / mainWidth) * spanX : 0));
      const row = Math.floor(currentViewport.y0 + (mainHeight > 0 ? (localY / mainHeight) * spanY : 0));
      if (col >= 0 && col < numColumns && row >= 0 && row < numSeqs) {
        setHover({ row, col, clientX: event.clientX, clientY: event.clientY });
      } else {
        setHover(null);
      }
    },
    [dragHandlers, currentViewport.x0, currentViewport.y0, mainWidth, mainHeight, spanX, spanY, numColumns, numSeqs]
  );

  const handlePointerLeave = useCallback(() => setHover(null), []);

  return (
    <div className={cx("text-foreground", css({ display: "flex", flexDirection: "column", width }))}>
      <ViewportToolbar viewport={currentViewport} panBy={panBy} zoomBy={zoomBy} reset={reset} axes="both" />
      <CursorPositionBadge hover={hover} msa={msa} />

      <OffscreenCanvas
        msa={msa}
        colorStyle={effectiveColorStyle}
        colorContext={colorContext}
        darkMode={darkMode}
        showLetters={showLetters}
        cellSize={cellSize}
        canvasRef={offscreenCanvasRef}
        highlightPattern={highlightPattern}
        highlightUseRegex={highlightUseRegex}
        showOnlyDifferences={showOnlyDifferences}
        referenceSequence={consensusSequence.sequence}
      />
      {showConsensus && (
        <OffscreenCanvas
          msa={[consensusSequence]}
          colorStyle={effectiveColorStyle}
          colorContext={colorContext}
          darkMode={darkMode}
          showLetters={showLetters}
          cellSize={cellSize}
          canvasRef={consensusOffscreenCanvasRef}
          highlightPattern={highlightPattern}
          highlightUseRegex={highlightUseRegex}
        />
      )}

      {showMinimap && (
        <div className={css({ display: "flex", marginBottom: "0.5em" })} style={{ marginLeft: labelSpace }}>
          <Minimap
            offscreenCanvasRef={offscreenCanvasRef}
            numColumns={numColumns}
            numSeqs={numSeqs}
            cellSize={cellSize}
            pixelWidth={mainWidth}
            pixelHeight={minimapHeight}
            sourceRevision={sourceRevision}
            viewport={currentViewport}
            setViewport={setViewport}
            panBy={panBy}
          />
        </div>
      )}

      {showScalebar && (
        <div className={css({ display: "flex" })} style={{ marginLeft: labelSpace }}>
          <Scalebar
            width={mainWidth}
            columnCount={numColumns}
            x0={currentViewport.x0}
            pixelsPerColumn={pixelsPerColumn}
            hoverCol={hover?.col ?? null}
          />
        </div>
      )}

      {showConsensus && (
        <div className={css({ display: "flex", marginBottom: "0.25em" })}>
          {showLabels && (
            <MSALabels msa={[consensusSequence]} width={labelSpace} height={cellSize} cellSize={cellSize} y0={0} />
          )}
          <AlignmentCanvas
            offscreenCanvasRef={consensusOffscreenCanvasRef}
            sourceWindow={{ x0: currentViewport.x0, x1: currentViewport.x1, y0: 0, y1: 1 }}
            sourceRevision={sourceRevision}
            cellSize={cellSize}
            pixelWidth={mainWidth}
            pixelHeight={cellSize}
          />
        </div>
      )}

      <div className={css({ display: "flex" })}>
        {showLabels && (
          <MSALabels msa={msa} width={labelSpace} height={mainHeight} cellSize={cellSize} y0={currentViewport.y0} />
        )}
        <AlignmentCanvas
          offscreenCanvasRef={offscreenCanvasRef}
          sourceWindow={currentViewport}
          sourceRevision={sourceRevision}
          cellSize={cellSize}
          pixelWidth={mainWidth}
          pixelHeight={mainHeight}
          interaction={{
            ...dragHandlers,
            ...wheelHandlers,
            onPointerMove: handlePointerMove,
            onPointerLeave: handlePointerLeave,
          }}
        />
      </div>
      <CursorTooltip hover={hover} msa={msa} />
    </div>
  );
}
