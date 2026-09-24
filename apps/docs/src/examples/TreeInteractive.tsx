import { useRef, useState } from "react";
import {
  PhyloTree,
  ladderizeOrder,
  midpointRoot,
  rotateOrder,
  serializeSvg,
  type TreeNodeInfo,
  type TreeNodeStyle,
  type TreeSelection,
} from "react-bio-viz";

import { Demo } from "../components/Demo";
import { tree } from "../lib/data";

const COLOURS = ["#d62728", "#1f77b4", "#2ca02c", "#9467bd"];

/** A node menu like acacia's: every action is a pure function of the tree and the selection. */
export default function TreeInteractive() {
  const [selection, setSelection] = useState<TreeSelection>({ collapsed: [] });
  const [styles, setStyles] = useState<Record<string, TreeNodeStyle>>({});
  const [node, setNode] = useState<TreeNodeInfo | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const act = (update: (s: TreeSelection) => TreeSelection) => {
    setSelection(update);
    setNode(null);
  };
  const colour = (color: string) => {
    if (!node) return;
    setStyles((s) => ({ ...s, ...Object.fromEntries(node.descendantIds.map((id) => [id, { color }])) }));
    setNode(null);
  };
  const exportSvg = () => {
    if (!svg.current) return;
    const url = URL.createObjectURL(new Blob([serializeSvg(svg.current, { background: "white" })], { type: "image/svg+xml" }));
    Object.assign(document.createElement("a"), { href: url, download: "tree.svg" }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <Demo>
      {(width) => (
        <>
          <div className="rbv-demo-controls">
            <button type="button" onClick={() => act((s) => ({ ...s, ...midpointRoot(tree) }))}>Midpoint root</button>
            <button type="button" onClick={() => act((s) => ({ ...s, order: ladderizeOrder(tree, s, "desc") }))}>Ladderize</button>
            <button type="button" onClick={() => { setSelection({ collapsed: [] }); setStyles({}); }}>Reset</button>
            <button type="button" onClick={exportSvg}>Export SVG</button>
          </div>
          {node && (
            <div className="rbv-demo-menu" style={{ left: node.clientX + 8, top: node.clientY + 8 }}>
              <strong>{node.isLeaf ? node.name : `Clade of ${node.leafNames.length}`}</strong>
              {node.rerootAbove && <button type="button" onClick={() => act((s) => ({ ...s, ...node.rerootAbove }))}>Reroot here</button>}
              {!node.isLeaf && <button type="button" onClick={() => act((s) => ({ ...s, order: rotateOrder(tree, s, node.id) }))}>Rotate children</button>}
              {!node.isLeaf && (
                <button
                  type="button"
                  onClick={() =>
                    act((s) => ({
                      ...s,
                      collapsed: s.collapsed.includes(node.id) ? s.collapsed.filter((c) => c !== node.id) : [...s.collapsed, node.id],
                    }))
                  }
                >
                  {node.isCollapsed ? "Expand" : "Collapse"}
                </button>
              )}
              <span className="rbv-demo-swatches">
                {COLOURS.map((c) => (
                  <button key={c} type="button" aria-label={`Colour ${c}`} style={{ background: c }} onClick={() => colour(c)} />
                ))}
              </span>
              <button type="button" onClick={() => setNode(null)}>Close</button>
            </div>
          )}
          <PhyloTree
            tree={tree}
            width={width}
            height={600}
            leafSpacing={18}
            interactive
            selection={selection}
            onSelectionChange={setSelection}
            onNodeClick={setNode}
            activeNodeId={node?.id}
            nodeStyles={styles}
            branchStyles={styles}
            svgRef={svg}
          />
        </>
      )}
    </Demo>
  );
}
