import { useMemo, useState } from "react";
import {
  MultipleSequenceAlignment,
  createControllableStore,
  createZustandStoreController,
  type Viewport,
} from "react-bio-viz";

import { Demo } from "../components/Demo";
import { subset } from "../lib/data";

const alignment = subset(20);

export default function ControlledState() {
  // Two alignments bound to one external store show the same window: pan either, both move.
  const viewportStore = useMemo(() => {
    const store = createControllableStore<Viewport>({ x0: 0, x1: 50, y0: 0, y1: 8, xMin: 0, xMax: 1000, yMin: 0, yMax: 20 });
    return { store, controller: createZustandStoreController(store, (v) => v, (s, next) => s.setState((prev) => (typeof next === "function" ? next(prev) : next))) };
  }, []);
  const [shown, setShown] = useState<Viewport | null>(null);

  return (
    <Demo>
      {(width) => (
        <>
          <div className="rbv-demo-controls">
            <button type="button" onClick={() => viewportStore.controller.setValue((v) => ({ ...v, x0: 100, x1: 100 + (v.x1 - v.x0) }))}>
              Jump to column 100
            </button>
            <span>{shown ? `Columns ${Math.round(shown.x0) + 1}–${Math.round(shown.x1)}` : "Pan either view"}</span>
          </div>
          <MultipleSequenceAlignment msa={alignment} width={width} height={200} options={{ showMinimap: false, showToolbar: false }} viewportStore={viewportStore.controller} onViewportChange={setShown} />
          <MultipleSequenceAlignment msa={alignment} width={width} height={200} options={{ showMinimap: false, showToolbar: false, colorStyle: "Conserved", showLetters: false }} viewportStore={viewportStore.controller} />
        </>
      )}
    </Demo>
  );
}
