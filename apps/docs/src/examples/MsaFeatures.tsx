import { useState } from "react";
import { COLOR_STYLES, MultipleSequenceAlignment, type ColorStyle, type MSASelection } from "react-bio-viz";

import { Demo } from "../components/Demo";
import { subset } from "../lib/data";

const alignment = subset(30);

export default function MsaFeatures() {
  const [colorStyle, setColorStyle] = useState<ColorStyle | "">("");
  const [mode, setMode] = useState<"pan" | "select">("pan");
  const [axis, setAxis] = useState<"columns" | "rows">("columns");
  const [selection, setSelection] = useState<MSASelection>({ rows: [], columns: [] });

  return (
    <Demo>
      {(width) => (
        <>
          <div className="rbv-demo-controls">
            <label>
              Colour{" "}
              <select value={colorStyle} onChange={(e) => setColorStyle(e.target.value as ColorStyle | "")}>
                <option value="">Auto</option>
                {COLOR_STYLES.filter((style) => !style.endsWith("score")).map((style) => (
                  <option key={style}>{style}</option>
                ))}
              </select>
            </label>
            <label>
              Drag{" "}
              <select value={mode} onChange={(e) => setMode(e.target.value as "pan" | "select")}>
                <option value="pan">pans</option>
                <option value="select">selects</option>
              </select>
            </label>
            <label>
              Select{" "}
              <select value={axis} onChange={(e) => setAxis(e.target.value as "columns" | "rows")}>
                <option value="columns">columns</option>
                <option value="rows">rows</option>
              </select>
            </label>
            <span>
              Selected: {selection.rows.length} rows, {selection.columns.length} columns
            </span>
          </div>
          <MultipleSequenceAlignment
            msa={alignment}
            width={width}
            height={520}
            options={{
              colorStyle: colorStyle || undefined,
              tracks: ["conservation", "logo"],
              interactionMode: mode,
              selectionAxis: axis,
            }}
            selection={selection}
            onSelectionChange={setSelection}
          />
        </>
      )}
    </Demo>
  );
}
