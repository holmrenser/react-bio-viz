import { useMemo, useState } from "react";
import { DistanceMatrix, type DistanceColorScheme } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { subset } from "../lib/data";
import { pDistances } from "../lib/phylo";

const alignment = subset(40);

export default function DistanceMatrixBasic() {
  const matrix = useMemo(() => pDistances(alignment), []);
  const [scheme, setScheme] = useState<DistanceColorScheme>("warm");
  const [numbers, setNumbers] = useState(true);
  return (
    <Demo>
      {(width) => (
        <>
          <div className="rbv-demo-controls">
            <label>
              Palette{" "}
              <select value={scheme} onChange={(e) => setScheme(e.target.value as DistanceColorScheme)}>
                <option>warm</option>
                <option>cool</option>
                <option>green</option>
                <option>grayscale</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={numbers} onChange={() => setNumbers((v) => !v)} /> Numbers
            </label>
          </div>
          <DistanceMatrix
            labels={alignment.map((s) => s.header)}
            matrix={matrix}
            width={width}
            height={520}
            options={{ colorScheme: scheme, showNumbers: numbers }}
          />
        </>
      )}
    </Demo>
  );
}
