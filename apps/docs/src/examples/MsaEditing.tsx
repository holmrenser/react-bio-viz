import { useState } from "react";
import { MultipleSequenceAlignment, type AlignedSequences } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { subset } from "../lib/data";

/**
 * The component never edits its data: it reports renames and removals, and this example applies
 * them to its own state — keeping a history, so undo is just popping it.
 */
export default function MsaEditing() {
  const [history, setHistory] = useState<AlignedSequences[]>([subset(12).map((s) => ({ ...s, id: s.header }))]);
  const alignment = history[history.length - 1];
  const apply = (next: AlignedSequences) => setHistory((h) => [...h, next]);

  return (
    <Demo>
      {(width) => (
        <>
          <div className="rbv-demo-controls">
            <button type="button" disabled={history.length < 2} onClick={() => setHistory((h) => h.slice(0, -1))}>
              Undo ({history.length - 1})
            </button>
            <span>
              {alignment.length} sequences · {alignment[0].sequence.length} columns
            </span>
          </div>
          <MultipleSequenceAlignment
            msa={alignment}
            width={width}
            height={360}
            options={{ showMinimap: false }}
            onRenameRow={(id, name) => apply(alignment.map((s) => (s.id === id ? { ...s, header: name } : s)))}
            onRemoveRows={(ids) => apply(alignment.filter((s) => !ids.includes(s.id!)))}
            onRemoveColumns={(columns) => {
              const removed = new Set(columns);
              apply(alignment.map((s) => ({ ...s, sequence: [...s.sequence].filter((_, i) => !removed.has(i)).join("") })));
            }}
          />
        </>
      )}
    </Demo>
  );
}
