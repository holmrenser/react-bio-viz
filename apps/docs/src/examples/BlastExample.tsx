import { useState } from "react";
import { BlastHitDistribution, type BlastMetric, type HitSelection } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { blastHits } from "../lib/genomeData";

export default function BlastExample() {
  const [selection, setSelection] = useState<HitSelection>({ selectedHitIds: [] });
  const [metric, setMetric] = useState<BlastMetric>("evalue");
  return (
    <Demo>
      {(width) => (
        <>
          <div className="rbv-demo-controls">
            <label>
              Colour by{" "}
              <select value={metric} onChange={(e) => setMetric(e.target.value as BlastMetric)}>
                <option value="evalue">e-value</option>
                <option value="bitScore">bit score</option>
                <option value="percentIdentity">% identity</option>
              </select>
            </label>
            <span>Selected: {selection.selectedHitIds.join(", ") || "none"}</span>
          </div>
          <BlastHitDistribution
            hits={blastHits}
            queryLength={2000}
            queryName="query-1"
            width={width}
            metric={metric}
            onMetricChange={setMetric}
            selection={selection}
            onSelectionChange={setSelection}
          />
        </>
      )}
    </Demo>
  );
}
