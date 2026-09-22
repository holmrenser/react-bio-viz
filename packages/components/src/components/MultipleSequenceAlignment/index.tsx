import React, { useEffect, useContext, createContext, useRef } from "react";
import { aaColors, ColorMap, PaletteName, BioLetter } from "../util";
import { css } from "@emotion/css";
import { createStore, useStore } from "zustand";
// import { getConsensus } from "./computations";
import { ZoomBox } from "./zoombox";
import { getConsensus } from "./computations";

const BLOCKSIZE = 20;

/** @public */
export type Sequence = {
  // Sequence identifier (e.g. from fasta header)
  header: string;
  // Arbitrary biological sequence (nucleotide, amino acid, etc.)
  sequence: string;
};

/** @public */
export type AlignedSequences = Sequence[];

function RowNames({
  msa,
  height,
  width,
  rowHeight,
}: {
  msa: AlignedSequences;
  height: number;
  width: number;
  rowHeight: number;
}): JSX.Element {
  return (
    <ul
      className={css({
        width,
        height,
        marginBlock: 0,
        paddingInline: 0,
        paddingRight: ".5em",
        overflow: "visible",
        zIndex: 2,
        fontFamily: "helvetica; arial; monospace",
      })}
    >
      {msa.map(({ header }) => (
        <li
          key={header}
          className={css({
            overflow: "hidden",
            height: rowHeight,
            fontSize: 8,
            whiteSpace: "nowrap",
            "&:hover": {
              overflow: "visible",
            },
          })}
        >
          <span
            className={css({
              backgroundColor: "white",
              display: "inline-block",
              zIndex: 2,
              paddingRight: ".25em",
              fontWeight: header === "Consensus" ? 800 : 500,
            })}
          >
            {header}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** @public */
export interface MSABlockProps {
  /**JSON formated multiple sequence alignment */
  msa: AlignedSequences;
  /**Maximum width of the HTML element, if the MSA is wider a scroll bar appears (default = num_columns * colWidth) */
  width?: number;
  /**Maximum height of the HTML element, if the MSA is higher a scroll bar appears (default = num_sequences * rowHeight)*/
  height?: number;
  /**Color palette for coloring different residue types (default = 'individual') */
  palette?: PaletteName;
  /**Show sequence names (default = true)*/
  showRowHeader?: boolean;
  /**Maximum width in pixels of the sequence name field (default = 100) */
  rowHeaderWidth?: number;
  /**Show letters for individual residues in the alignment */
  showText?: boolean;
  /** */
  overview?: boolean;
}

function OffscreenMSACanvas({
  msa,
  offScreenCanvasRef,
  colorMap,
  showText,
}: {
  msa: AlignedSequences;
  offScreenCanvasRef: React.RefObject<HTMLCanvasElement>;
  colorMap: ColorMap;
  showText: boolean;
}) {
  const numColumns = msa[0].sequence.length;
  const numSeqs = msa.length;
  useEffect(() => {
    if (offScreenCanvasRef && offScreenCanvasRef.current) {
      const canvas = offScreenCanvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        context.font = `${BLOCKSIZE * 0.9}px monospace`;
        msa.forEach(({ sequence }, seq_i) => {
          // individual nucl/aa
          sequence.split("").forEach((letter, char_i) => {
            // draw a square
            context.fillStyle = colorMap.get(letter as BioLetter) || "#000000";
            context.fillRect(
              char_i * BLOCKSIZE, // x
              seq_i * BLOCKSIZE, // y
              BLOCKSIZE,
              BLOCKSIZE
            );
            // add the letter
            if (showText) {
              context.fillStyle = "black";
              context.textAlign = "center";
              context.fillText(
                letter, // text
                (char_i + 0.5) * BLOCKSIZE, // x
                (seq_i + 0.8) * BLOCKSIZE // y
              );
            }
          });
        });
      }
    }
  }, [msa]);
  return (
    <canvas
      className={`off-screen-canvas ${css({ display: "None" })}`}
      ref={offScreenCanvasRef}
      height={numSeqs * BLOCKSIZE}
      width={numColumns * BLOCKSIZE}
    />
  );
}

function OnscreenMSACanvas({
  msa,
  maxWidth,
  maxHeight,
  onScreenCanvasRef,
  offScreenCanvasRef,
  overview,
}: {
  msa: AlignedSequences;
  maxWidth: number;
  maxHeight: number;
  onScreenCanvasRef: React.RefObject<HTMLCanvasElement>;
  offScreenCanvasRef: React.RefObject<HTMLCanvasElement>;
  overview: boolean;
}) {
  const numColumns = msa[0].sequence.length;
  const numSeqs = msa.length;

  const zoomStore = useContext(ZoomContext);
  if (!zoomStore) throw new Error("Missing ZoomContext.Provider in react tree");
  const zoomBox: ZoomBox = useStore(zoomStore, ({ zoomBox }) => zoomBox);
  console.log(zoomBox);
  useEffect(() => {
    if (
      offScreenCanvasRef &&
      offScreenCanvasRef.current &&
      onScreenCanvasRef &&
      onScreenCanvasRef.current
    ) {
      const canvas = onScreenCanvasRef.current;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(
          offScreenCanvasRef.current,
          overview ? 0 : zoomBox.x0 * BLOCKSIZE, // source x
          overview ? 0 : zoomBox.y0 * BLOCKSIZE, // source y
          overview ? numColumns * BLOCKSIZE : zoomBox.width * BLOCKSIZE, // source width
          overview ? numSeqs * BLOCKSIZE : zoomBox.height * BLOCKSIZE, // source height
          0, // destination x
          0, // destination y
          maxWidth, // destination width
          maxHeight // destination height
        );
      }
    }
  }, [msa, zoomBox]);
  return (
    <canvas
      className={`on-screen-canvas ${css({
        zIndex: 1,
      })}`}
      ref={onScreenCanvasRef}
      height={maxHeight}
      width={maxWidth}
    />
  );
}

function ZoomboxOverview({
  maxWidth,
  maxHeight,
}: {
  maxWidth: number;
  maxHeight: number;
}) {
  const zoomStore = useContext(ZoomContext);
  if (!zoomStore) throw new Error("Missing ZoomContext.Provider in react tree");
  const zoomBox: ZoomBox = useStore(zoomStore, ({ zoomBox }) => zoomBox);
  return (
    <span
      className={`zoombox-overview ${css({
        position: "absolute",
        left: (zoomBox.x0 / zoomBox.xMax) * maxWidth,
        top: (zoomBox.y0 / zoomBox.yMax) * maxHeight,
        width: (zoomBox.width / zoomBox.xMax) * maxWidth,
        height: (zoomBox.height / zoomBox.yMax) * maxHeight,
        backgroundColor: "rgba(90,90,90,0.5)",
        borderColor: "black",
        borderWidth: "4px",
        zIndex: 100,
      })}`}
    />
  );
}

function MSABlock({
  msa,
  width,
  height,
  palette = "individual",
  rowHeaderWidth = 100,
  showRowHeader = true,
  showText = true,
  overview = false,
}: MSABlockProps): JSX.Element {
  const numColumns = msa[0].sequence.length;
  const numSeqs = msa.length;

  const colorMap: ColorMap = aaColors.has(palette as PaletteName)
    ? (aaColors.get(palette as PaletteName) as ColorMap)
    : (aaColors.get("polarity") as ColorMap);

  const onScreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const offScreenCanvasRef = useRef<HTMLCanvasElement>(null);

  const canvasWidth = numColumns * BLOCKSIZE;
  const maxWidth = typeof width === "undefined" ? canvasWidth : width;

  const canvasHeight = numSeqs * BLOCKSIZE;
  const maxHeight = typeof height === "undefined" ? canvasHeight : height;

  return (
    <div
      className={`multiple-sequence-alignment ${css({
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        maxHeight,
        maxWidth,
        position: "relative",
      })}`}
    >
      {showRowHeader && (
        <RowNames
          msa={msa}
          height={maxHeight}
          width={rowHeaderWidth}
          rowHeight={BLOCKSIZE}
        />
      )}
      <div
        className={css({
          maxWidth: maxWidth - rowHeaderWidth,
          marginBottom: -BLOCKSIZE,
          overflowX: "hidden",
          overflowY: "hidden",
        })}
      >
        <OffscreenMSACanvas
          msa={msa}
          offScreenCanvasRef={offScreenCanvasRef}
          colorMap={colorMap}
          showText={showText}
        />
        <OnscreenMSACanvas
          msa={msa}
          maxWidth={maxWidth - rowHeaderWidth}
          maxHeight={maxHeight}
          onScreenCanvasRef={onScreenCanvasRef}
          offScreenCanvasRef={offScreenCanvasRef}
          overview={overview}
        />

        {overview && (
          <ZoomboxOverview
            maxWidth={maxWidth - rowHeaderWidth}
            maxHeight={maxHeight}
          />
        )}
      </div>
    </div>
  );
}

/** @public */
export interface MultipleSequenceAlignmentProps {
  /**JSON formated multiple sequence alignment */
  msa: AlignedSequences;
  /**Maximum width of the HTML element, if the MSA is wider a scroll bar appears (default = num_columns * colWidth) */
  width?: number;
  /**Width in pixels of individual columns in the MSA visualization (default = 10)*/
  height?: number;
  /**Height in pixels of indivual rows in the MSA visualization (default = 10) */
  palette?: PaletteName;
  /**Show sequence names (default = true)*/
  showRowHeader?: boolean;
  /**Maximum width in pixels of the sequence name field (default = 100) */
  rowHeaderWidth?: number;
  /**Add consensus sequence at the top of the alignment */
  showConsensus?: boolean;
  /** Add a zoomed out overview above the main MSA viewer*/
  showOverview?: boolean;
}

type ZoomState = {
  zoomBox: ZoomBox;
};

type ZoomAction = {
  panLeft: (stepsize?: number) => void;
  panRight: (stepsize?: number) => void;
  panUp: (stepsize?: number) => void;
  panDown: (stepsize?: number) => void;
};

type ZoomStore = ReturnType<typeof createZoomStore>;

const createZoomStore = (initZoom?: Partial<ZoomState>) => {
  const DEFAULT_ZOOM: ZoomState = {
    zoomBox: new ZoomBox({ x0: 0, xMax: 0, yMax: 0 }),
  };
  return createStore<ZoomState & ZoomAction>()((set) => ({
    ...DEFAULT_ZOOM,
    ...initZoom,
    panLeft: (stepSize = 100) =>
      set((state) => ({ zoomBox: state.zoomBox.panLeft(stepSize) })),
    panRight: (stepSize = 100) =>
      set((state) => ({ zoomBox: state.zoomBox.panRight(stepSize) })),
    panUp: (stepSize = 100) =>
      set((state) => ({ zoomBox: state.zoomBox.panUp(stepSize) })),
    panDown: (stepSize = 100) =>
      set((state) => ({ zoomBox: state.zoomBox.panDown(stepSize) })),
  }));
};

const ZoomContext = createContext<ZoomStore | null>(null);

function ZoomableMSA({
  msa,
  width,
  height,
  palette,
  showConsensus,
  showOverview,
  rowHeaderWidth,
}: Required<MultipleSequenceAlignmentProps>): React.JSX.Element {
  const zoomStore = useContext(ZoomContext);
  if (!zoomStore) throw new Error("Missing ZoomContext.Provider in react tree");
  const state = useStore(zoomStore);
  return (
    <>
      <div
        className="buttons has-addons"
        style={{ display: "inline-block", marginRight: "1em" }}
      >
        <button
          className="button is-small"
          onClick={() => state.panLeft()}
          disabled={state.zoomBox.x0 <= 0.001}
        >
          &larr;
        </button>
        <button
          className="button is-small"
          onClick={() => state.panRight()}
          disabled={
            state.zoomBox.x1 - state.zoomBox.width >= state.zoomBox.xMax
          }
        >
          &rarr;
        </button>
      </div>
      <div
        className="buttons has-addons"
        style={{ display: "inline-block", marginRight: "1em" }}
      >
        <button
          className="button is-small"
          onClick={() => state.panUp()}
          //disabled={zoomBox.y0 <= 0.001}
        >
          &uarr;
        </button>
        <button
          className="button is-small"
          onClick={() => state.panDown()}
          //disabled={zoomBox.y1 >= 1}
        >
          &darr;
        </button>
      </div>
      <div
        className="buttons has-addons"
        style={{ display: "inline-block", marginRight: "1em" }}
      >
        <button
          className="button is-small"
          //onClick={() => dispatch({ type: "zoomIn" })}
          // disabled={zoomBox.y0 <= 0.001}
        >
          +
        </button>
        <button
          className="button is-small"
          //onClick={() => dispatch({ type: "zoomOut" })}
          // disabled={zoomBox.y1 >= 1}
        >
          -
        </button>
      </div>
      {showOverview && (
        <>
          <h2 className="subtitle">Overview</h2>
          <div className="msa-overview" style={{ marginLeft: rowHeaderWidth }}>
            <MSABlock
              msa={msa}
              width={width}
              rowHeaderWidth={rowHeaderWidth}
              height={0.25 * height}
              showRowHeader={false}
              showText={false}
              palette={palette}
              overview={true}
            />
          </div>
        </>
      )}

      {showConsensus && (
        <>
          <h2 className="subtitle">Consensus</h2>
          <div className="msa-overview" style={{ marginLeft: rowHeaderWidth }}>
            <MSABlock
              msa={[getConsensus(msa)]}
              width={width}
              rowHeaderWidth={rowHeaderWidth}
              height={BLOCKSIZE}
              showRowHeader={false}
              showText={false}
              palette={palette}
              overview={false}
            />
          </div>
        </>
      )}

      <h2 className="subtitle">MSA</h2>
      <MSABlock
        msa={msa}
        width={width}
        rowHeaderWidth={rowHeaderWidth}
        height={0.75 * height}
        palette={palette}
      />
    </>
  );
}

export function MultipleSequenceAlignment({
  msa,
  width = 650,
  height = 400,
  palette = "individual",
  showConsensus = true,
  showOverview = true,
}: MultipleSequenceAlignmentProps): React.JSX.Element {
  const numColumns = msa[0].sequence.length;
  const numSeqs = msa.length;
  const zoomStore = useRef(
    createZoomStore({
      zoomBox: new ZoomBox({
        x1: 150,
        y1: 150 * (height / width),
        xMax: numColumns,
        yMax: numSeqs,
      }),
    })
  ).current;
  return (
    <ZoomContext.Provider value={zoomStore}>
      <ZoomableMSA
        msa={msa}
        width={width}
        height={height}
        palette={palette}
        showConsensus={showConsensus}
        showOverview={showOverview}
        rowHeaderWidth={150}
        showRowHeader
      />
    </ZoomContext.Provider>
  );
}
