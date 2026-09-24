import { useMemo, useReducer, useRef, useState } from "react";

import {
  BlastHitDistribution,
  createControllableStore,
  createZustandStoreController,
  DistanceMatrix,
  GenomeBrowser,
  GeneModel,
  ladderizeOrder,
  midpointRoot,
  MultipleSequenceAlignment,
  PhyloTree,
  rotateOrder,
  serializeSvg,
} from "react-bio-viz";
import type {
  AlignedSequences,
  BlastHit,
  ColorStyle,
  MSASelection,
  MSATrack,
  StoreController,
  TreeNodeInfo,
  TreeNodeStyle,
  TreeSelection,
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

/** p-distance (share of differing non-gap positions) — enough to demo the matrix. */
function pDistances(rows: AlignedSequences): number[][] {
  return rows.map((a) =>
    rows.map((b) => {
      let compared = 0;
      let differing = 0;
      for (let i = 0; i < a.sequence.length; i += 1) {
        if (a.sequence[i] === "-" || b.sequence[i] === "-") continue;
        compared += 1;
        if (a.sequence[i] !== b.sequence[i]) differing += 1;
      }
      return compared > 0 ? differing / compared : 0;
    })
  );
}

/**
 * One row order shared by the alignment and the distance matrix: both bind the same store, so
 * dragging a label in either reorders both — the external-store seam every component supports.
 */
function useSharedRowOrder(): StoreController<string[]> {
  return useMemo(() => {
    const store = createControllableStore<string[]>([]);
    return createZustandStoreController(
      store,
      (order) => order,
      (s, next) => s.setState((prev) => (typeof next === "function" ? next(prev) : next))
    );
  }, []);
}

const MSA_TRACKS: MSATrack[] = ["conservation", "logo"];

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

  // The alignment is edited here, not by the component: it reports renames and removals, and the
  // demo keeps an undo stack of whole alignments.
  const [history, setHistory] = useState<AlignedSequences[]>([msa.map((s) => ({ ...s, id: s.header }))]);
  const alignment = history[history.length - 1];
  const edit = (next: AlignedSequences) => setHistory((h) => [...h, next]);
  const [msaSelection, setMsaSelection] = useState<MSASelection>({ rows: [], columns: [] });
  const rowOrderStore = useSharedRowOrder();
  const distances = useMemo(() => pDistances(alignment), [alignment]);

  const [treeSelection, setTreeSelection] = useState<TreeSelection>({ collapsed: [] });
  const [nodeStyles, setNodeStyles] = useState<Record<string, TreeNodeStyle>>({});
  const [panelNode, setPanelNode] = useState<TreeNodeInfo | null>(null);
  const [showBranchLengths, setShowBranchLengths] = useState(false);
  const treeSvg = useRef<SVGSVGElement>(null);

  const exportTree = () => {
    if (!treeSvg.current) return;
    const url = URL.createObjectURL(new Blob([serializeSvg(treeSvg.current, { background: "white" })], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tree.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

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
        <button type="button" disabled={history.length < 2} onClick={() => setHistory((h) => h.slice(0, -1))}>
          Undo edit
        </button>
        <p>
          Drag labels to reorder (the distance matrix follows), double-click a label to rename, Shift-drag to select
          columns, Delete to remove the selection. Selected: {msaSelection.rows.length} rows, {msaSelection.columns.length}{" "}
          columns.
        </p>
        <MultipleSequenceAlignment
          msa={alignment}
          width={1200}
          height={520}
          options={{ colorStyle: msaColorStyle, tracks: MSA_TRACKS }}
          selection={msaSelection}
          onSelectionChange={setMsaSelection}
          rowOrderStore={rowOrderStore}
          onRenameRow={(id, name) => edit(alignment.map((s) => (s.id === id ? { ...s, header: name } : s)))}
          onRemoveRows={(ids) => edit(alignment.filter((s) => !ids.includes(s.id ?? s.header)))}
          onRemoveColumns={(columns) => {
            const removed = new Set(columns);
            edit(
              alignment.map((s) => ({
                ...s,
                sequence: s.sequence
                  .split("")
                  .filter((_, i) => !removed.has(i))
                  .join(""),
              }))
            );
          }}
        />
      </section>
      <hr />

      <section className="section">
        <h1 className="title">Distance matrix</h1>
        <p>p-distances of the alignment above, sharing its row order.</p>
        <DistanceMatrix
          labels={alignment.map((s) => s.id ?? s.header)}
          labelNames={Object.fromEntries(alignment.map((s) => [s.id ?? s.header, s.header]))}
          matrix={distances}
          width={1200}
          height={500}
          rowOrderStore={rowOrderStore}
        />
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
        <label>
          <input type="checkbox" checked={showBranchLengths} onChange={() => setShowBranchLengths((v) => !v)} />
          Branch lengths
        </label>
        <br />
        <button type="button" onClick={() => setTreeSelection((s) => ({ ...s, ...midpointRoot(tree) }))}>
          Midpoint root
        </button>
        <button type="button" onClick={() => setTreeSelection((s) => ({ ...s, order: ladderizeOrder(tree, s, "desc") }))}>
          Ladderize
        </button>
        <button type="button" onClick={() => setTreeSelection({ collapsed: [] })}>
          Reset
        </button>
        <button type="button" onClick={exportTree}>
          Export SVG
        </button>
        <p>Click a node for actions; drag a node to reorder, or past either end of the tree to reroot on it.</p>
        {panelNode && (
          <div style={{ position: "fixed", left: panelNode.clientX + 8, top: panelNode.clientY + 8, background: "white", border: "1px solid #ccc", padding: 6, zIndex: 10 }}>
            <strong>{panelNode.isLeaf ? panelNode.name : `${panelNode.leafNames.length} leaves`}</strong>
            <br />
            {panelNode.rerootAbove && (
              <button type="button" onClick={() => { setTreeSelection((s) => ({ ...s, ...panelNode.rerootAbove })); setPanelNode(null); }}>
                Reroot here
              </button>
            )}
            {!panelNode.isLeaf && (
              <>
                <button type="button" onClick={() => { setTreeSelection((s) => ({ ...s, order: rotateOrder(tree, s, panelNode.id) })); setPanelNode(null); }}>
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTreeSelection((s) => ({
                      ...s,
                      collapsed: s.collapsed.includes(panelNode.id) ? s.collapsed.filter((c) => c !== panelNode.id) : [...s.collapsed, panelNode.id],
                    }));
                    setPanelNode(null);
                  }}
                >
                  {panelNode.isCollapsed ? "Expand" : "Collapse"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setNodeStyles((styles) => ({ ...styles, ...Object.fromEntries(panelNode.descendantIds.map((id) => [id, { color: "crimson" }])) }));
                setPanelNode(null);
              }}
            >
              Colour clade
            </button>
            <button type="button" onClick={() => setPanelNode(null)}>
              ×
            </button>
          </div>
        )}
        <PhyloTree
          tree={tree}
          layout={state.layout}
          showSupportValues={state.showSupportValues}
          shadeBranchBySupport={state.shadeBranchBySupport}
          fontSize={state.fontSize}
          width={state.width}
          height={state.height}
          interactive
          selection={treeSelection}
          onSelectionChange={setTreeSelection}
          onNodeClick={setPanelNode}
          activeNodeId={panelNode?.id}
          nodeStyles={nodeStyles}
          branchStyles={nodeStyles}
          showBranchLengths={showBranchLengths}
          svgRef={treeSvg}
        />
      </section>
      <hr />
    </div>
  );
}
