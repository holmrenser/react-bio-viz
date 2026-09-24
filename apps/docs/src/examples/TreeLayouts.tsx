import { useState } from "react";
import { PhyloTree, type LayoutMode } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { tree } from "../lib/data";

export default function TreeLayouts() {
  const [layout, setLayout] = useState<LayoutMode>("rectangular");
  const [branchLengths, setBranchLengths] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <Demo>
      {(width) => (
        <>
          <div className="rbv-demo-controls">
            <label>
              Layout{" "}
              <select value={layout} onChange={(e) => setLayout(e.target.value as LayoutMode)}>
                <option>rectangular</option>
                <option>cladogram</option>
                <option>radial</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={branchLengths} onChange={() => setBranchLengths((v) => !v)} /> Branch lengths
            </label>
            <label>
              Search <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Potri" />
            </label>
          </div>
          <PhyloTree
            tree={tree}
            layout={layout}
            width={width}
            height={layout === "radial" ? Math.min(width, 700) : 600}
            leafSpacing={layout === "radial" ? undefined : 18}
            showBranchLengths={branchLengths}
            searchQuery={search || undefined}
          />
        </>
      )}
    </Demo>
  );
}
