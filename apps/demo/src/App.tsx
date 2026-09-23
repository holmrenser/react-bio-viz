import { useReducer, useState } from "react";

import { BlastHitDistribution, GenomeBrowser, GeneModel, MultipleSequenceAlignment, PhyloTree } from "react-bio-viz";
import type {
  BlastHit,
  ColorStyle,
  CoverageTrack,
  FeatureTrack,
  GeneModelTrack,
  GenomeTrack,
  HitSelection,
  LayoutMode,
} from "react-bio-viz";
import { COLOR_STYLES } from "react-bio-viz";

import { genemodel, msa, tree } from "./data";

const genomeBrowserTracks: GenomeTrack[] = [
  {
    id: "repeats",
    label: "Repeats",
    kind: "feature",
    data: [
      { id: "r1", start: 35039800, end: 35040200, label: "LTR/Copia", color: "#c96" },
      { id: "r2", start: 35040100, end: 35040600, label: "LINE/L1", color: "#69c" },
      { id: "r3", start: 35043000, end: 35043500, label: "SINE", color: "#9c6" },
    ],
  } satisfies FeatureTrack,
  {
    id: "rnaseq",
    label: "RNA-seq",
    kind: "coverage",
    data: Array.from({ length: 40 }, (_, i) => {
      const position = 35039693 + i * 145;
      const inGene = position > 35039923 && position < 35045017;
      return { position, value: inGene ? 5 + 15 * Math.abs(Math.sin(i / 3)) : 0.5 };
    }),
  } satisfies CoverageTrack,
  { id: "gene", label: genemodel.attributes.name?.[0] ?? "Gene", kind: "genemodel", data: genemodel } satisfies GeneModelTrack,
];

const blastHits: BlastHit[] = [
  { id: "hit-1", queryId: "query-1", subjectId: "Homo sapiens PON1", queryStart: 20, queryEnd: 480, evalue: 1e-120, bitScore: 410, percentIdentity: 98.2 },
  { id: "hit-2", queryId: "query-1", subjectId: "Mus musculus Pon1", queryStart: 400, queryEnd: 900, evalue: 1e-95, bitScore: 340, percentIdentity: 91.5 }, // overlaps hit-1
  { id: "hit-3", queryId: "query-1", subjectId: "Danio rerio pon1", queryStart: 950, queryEnd: 1300, evalue: 1e-40, bitScore: 180, percentIdentity: 76.3 },
  { id: "hit-4", queryId: "query-1", subjectId: "Drosophila melanogaster Pon1-like", queryStart: 1280, queryEnd: 1600, evalue: 1e-8, bitScore: 65, percentIdentity: 58.9 }, // overlaps hit-3
  { id: "hit-5", queryId: "query-1", subjectId: "Arabidopsis thaliana PON-like", queryStart: 1650, queryEnd: 1980, evalue: 1e-3, bitScore: 42, percentIdentity: 45.1 },
];

type State = {
  layout: LayoutMode;
  showSupportValues?: boolean;
  shadeBranchBySupport?: boolean;
  fontSize?: number;
  width?: number;
  height?: number;
};

type Action =
  | { type: "setLayout"; value: LayoutMode }
  | { type: "toggleShowSupportValues" }
  | { type: "toggleShadeBranchBySupport" }
  | { type: "setFontSize"; value: number }
  | { type: "setWidth"; value: number }
  | { type: "setHeight"; value: number };

function stateReducer(state: State, action: Action): State {
  switch (action.type) {
    case "setLayout":
      return { ...state, layout: action.value };
    case "toggleShowSupportValues":
      return { ...state, showSupportValues: !state.showSupportValues };
    case "toggleShadeBranchBySupport":
      return { ...state, shadeBranchBySupport: !state.shadeBranchBySupport };
    case "setFontSize":
      return { ...state, fontSize: action.value };
    case "setWidth":
      return { ...state, width: action.value };
    case "setHeight":
      return { ...state, height: action.value };
    default:
      throw new Error("Invalid state operation");
  }
}

const TREE_LAYOUTS: LayoutMode[] = ["rectangular", "cladogram", "radial"];

export default function App(): JSX.Element {
  const [state, dispatch] = useReducer(stateReducer, {
    layout: "rectangular" as LayoutMode,
    showSupportValues: true,
    shadeBranchBySupport: true,
    fontSize: 11,
    width: 1200,
    height: 800,
  });
  const [blastSelection, setBlastSelection] = useState<HitSelection>({ selectedHitIds: [] });
  // Left undefined so the MSA picks a scheme from the alignment's own alphabet.
  const [msaColorStyle, setMsaColorStyle] = useState<ColorStyle | undefined>(undefined);

  return (
    <div className="container" style={{ margin: 0, padding: 0 }}>
      <hr />
      <section className="section">
        <h1 className="title">GeneModel</h1>
        {/* Uncontrolled: GeneModel owns its own pan/zoom viewport and ships a built-in toolbar. */}
        <GeneModel gene={genemodel} />
      </section>
      <hr />

      <section className="section">
        <h1 className="title">GenomeBrowser</h1>
        <GenomeBrowser
          tracks={genomeBrowserTracks}
          referenceLength={35039693 + 40 * 145}
          referenceName={genemodel.seqid}
          defaultViewport={{
            x0: 35039693,
            x1: 35045433,
            y0: 0,
            y1: 1,
            xMin: 0,
            xMax: 35039693 + 40 * 145,
            yMin: 0,
            yMax: 1,
          }}
          width={1200}
        />
      </section>
      <hr />

      <section className="section">
        <h1 className="title">BlastHitDistribution</h1>
        {/* Selection is controlled here so the demo can echo which hits are selected. */}
        <BlastHitDistribution
          hits={blastHits}
          queryLength={2000}
          queryName="query-1"
          width={1200}
          selection={blastSelection}
          onSelectionChange={setBlastSelection}
        />
        <p>Selected hits: {blastSelection.selectedHitIds.length === 0 ? "none" : blastSelection.selectedHitIds.join(", ")}</p>
      </section>
      <hr />

      <section className="section">
        <h1 className="title">Multiple Sequence Alignment</h1>
        <label>
          Color scheme{" "}
          <select
            value={msaColorStyle ?? ""}
            onChange={({ target: { value } }) => setMsaColorStyle(value === "" ? undefined : (value as ColorStyle))}
            style={{ marginBottom: "0.5em" }}
          >
            <option value="">Auto (detect alphabet)</option>
            {COLOR_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
        <MultipleSequenceAlignment msa={msa} options={{ colorStyle: msaColorStyle }} />
      </section>

      <hr />

      <section className="section">
        <h1 className="title">Phylogenetic tree</h1>
        <h2 className="subtitle">Maximum Likelihood</h2>
        <label>
          Layout{" "}
          <select
            value={state.layout}
            onChange={({ target: { value } }) => dispatch({ type: "setLayout", value: value as LayoutMode })}
            style={{ marginRight: "1em" }}
          >
            {TREE_LAYOUTS.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.showSupportValues}
            onChange={() => dispatch({ type: "toggleShowSupportValues" })}
          />
          Show support values
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.shadeBranchBySupport}
            onChange={() => dispatch({ type: "toggleShadeBranchBySupport" })}
          />
          Shade branches by support values
        </label>
        <br />
        <label>
          Font size
          <input
            type="number"
            value={state.fontSize}
            onChange={({ target: { value } }) =>
              dispatch({
                type: "setFontSize",
                value: Number(value),
              })
            }
            style={{
              width: "4em",
              marginRight: "1em",
            }}
          />
        </label>

        <label>
          Width
          <input
            type="number"
            value={state.width}
            onChange={({ target: { value } }) =>
              dispatch({
                type: "setWidth",
                value: Number(value),
              })
            }
            style={{
              width: "6em",
              marginRight: "1em",
            }}
          />
        </label>

        <label>
          Height
          <input
            type="number"
            value={state.height}
            onChange={({ target: { value } }) =>
              dispatch({
                type: "setHeight",
                value: Number(value),
              })
            }
            style={{
              width: "6em",
              marginRight: "1em",
            }}
          />
        </label>
        <PhyloTree
          tree={tree}
          layout={state.layout}
          showSupportValues={state.showSupportValues}
          shadeBranchBySupport={state.shadeBranchBySupport}
          fontSize={state.fontSize}
          width={state.width}
          height={state.height}
          interactive
        />
      </section>
      <hr />
    </div>
  );
}
