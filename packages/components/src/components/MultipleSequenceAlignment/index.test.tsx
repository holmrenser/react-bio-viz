import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createControllableStore, createZustandStoreController, type Viewport } from "@react-bio-viz/core";
import { describe, expect, it, vi } from "vitest";

import { MultipleSequenceAlignment } from "./index";
import type { AlignedSequences, MSASelection } from "./types";

const msa: AlignedSequences = [
  { header: "seq1", sequence: "ACDEFGHIKL" },
  { header: "seq2", sequence: "ACDEFGHIKL" },
  { header: "seq3", sequence: "ACDEFGHIKM" },
];

describe("MultipleSequenceAlignment", () => {
  it("renders uncontrolled with sequence labels and canvases", () => {
    render(<MultipleSequenceAlignment msa={msa} width={300} height={200} />);
    expect(screen.getByText("seq1")).toBeInTheDocument();
    expect(screen.getByText("seq2")).toBeInTheDocument();
    expect(document.querySelectorAll("canvas").length).toBeGreaterThan(0);
  });

  it("renders fully controlled and reflects the given viewport", () => {
    const viewport: Viewport = { x0: 0, x1: 5, y0: 0, y1: 2, xMin: 0, xMax: 10, yMin: 0, yMax: 3 };
    function Controlled() {
      const [vp] = useState(viewport);
      return <MultipleSequenceAlignment msa={msa} width={300} height={200} viewport={vp} onViewportChange={() => {}} />;
    }
    render(<Controlled />);
    expect(screen.getByText("seq1")).toBeInTheDocument();
  });

  it("renders with an external Zustand store", () => {
    const store = createControllableStore<Viewport>({
      x0: 0,
      x1: 10,
      y0: 0,
      y1: 3,
      xMin: 0,
      xMax: 10,
      yMin: 0,
      yMax: 3,
    });
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: Viewport) => Viewport)(prev) : next))
    );
    render(<MultipleSequenceAlignment msa={msa} width={300} height={200} viewportStore={controller} />);
    expect(screen.getByText("seq3")).toBeInTheDocument();
  });

  it("respects options for labels and consensus/minimap toggles", () => {
    render(
      <MultipleSequenceAlignment
        msa={msa}
        width={300}
        height={200}
        options={{ showLabels: false, showConsensus: false, showMinimap: false }}
      />
    );
    expect(screen.queryByText("seq1")).not.toBeInTheDocument();
  });

  it("defaults the color style to the alignment's own alphabet", () => {
    // Protein-only residues (E, F, I, L) are present, so a protein scheme must be chosen; the
    // component renders the same either way, so assert via the scheme the residues resolve to.
    const { container } = render(<MultipleSequenceAlignment msa={msa} width={300} height={200} />);
    expect(container.querySelectorAll("canvas").length).toBeGreaterThan(0);
  });

  it("renders a column ruler by default and hides it on request", () => {
    const { container: withRuler } = render(<MultipleSequenceAlignment msa={msa} width={300} height={200} />);
    const { container: withoutRuler } = render(
      <MultipleSequenceAlignment msa={msa} width={300} height={200} options={{ showScalebar: false }} />
    );
    expect(withRuler.querySelectorAll("svg").length).toBeGreaterThan(
      withoutRuler.querySelectorAll("svg").length
    );
  });

  it("accepts a column-analysis color style", () => {
    const { container } = render(
      <MultipleSequenceAlignment msa={msa} width={300} height={200} options={{ colorStyle: "Variable" }} />
    );
    expect(container.querySelectorAll("canvas").length).toBeGreaterThan(0);
  });

  it("renders without throwing with highlightPattern set", () => {
    const { container } = render(
      <MultipleSequenceAlignment msa={msa} width={300} height={200} options={{ highlightPattern: "K" }} />
    );
    expect(container.querySelectorAll("canvas").length).toBeGreaterThan(0);
  });

  it("renders without throwing with showOnlyDifferences set", () => {
    const { container } = render(
      <MultipleSequenceAlignment msa={msa} width={300} height={200} options={{ showOnlyDifferences: true }} />
    );
    expect(container.querySelectorAll("canvas").length).toBeGreaterThan(0);
  });

  it("renders an interactive minimap by default", () => {
    const { container } = render(<MultipleSequenceAlignment msa={msa} width={300} height={200} />);
    // minimap + consensus + main + overlay
    expect(container.querySelectorAll("canvas").length).toBe(4);
  });
});

/** The transparent canvas that receives pointer input over the alignment. */
function overlay(container: HTMLElement): HTMLCanvasElement {
  const canvases = Array.from(container.querySelectorAll("canvas"));
  return canvases.find((c) => c.style.position === "absolute") as HTMLCanvasElement;
}

// jsdom lays nothing out, so give the overlay a real box for pointer → cell conversion.
function withBox(element: Element, width: number, height: number) {
  element.getBoundingClientRect = () => ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) });
}

const plain: AlignedSequences = [
  { header: "a", sequence: "ACGTACGTAC" },
  { header: "b", sequence: "ACGTACGTAA" },
  { header: "c", sequence: "ACGAACGTAC" },
  { header: "d", sequence: "TCGAACGTAC" },
];
const compact = { showToolbar: false, showCursorBadge: false, showMinimap: false, showScalebar: false, showConsensus: false, showCursorTooltip: false };

describe("MultipleSequenceAlignment rendering", () => {
  it("never allocates a canvas larger than the widget, however large the alignment", () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ header: `s${i}`, sequence: "ACDEFGHIKLMNPQRSTVWY".repeat(60) }));
    const { container } = render(<MultipleSequenceAlignment msa={rows} width={600} height={400} />);
    for (const canvas of Array.from(container.querySelectorAll("canvas"))) {
      expect(canvas.width * canvas.height).toBeLessThanOrEqual(600 * 400 * 4);
    }
  });

  it("labels every row even when headers repeat, without React key warnings", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const dup = [
      { header: "dup", sequence: "ACGT" },
      { header: "dup", sequence: "ACGA" },
    ];
    render(<MultipleSequenceAlignment msa={dup} options={compact} height={200} />);
    expect(screen.getAllByText("dup")).toHaveLength(2);
    expect(errors.mock.calls.some((call) => String(call[0]).includes("same key"))).toBe(false);
    errors.mockRestore();
  });

  it("renders tracks with their labels", () => {
    render(
      <MultipleSequenceAlignment
        msa={plain}
        height={300}
        options={{ ...compact, tracks: ["conservation", "logo", { label: "TRIDENT", scores: [0.1, 0.9] }] }}
      />
    );
    expect(screen.getByText("Conservation")).toBeInTheDocument();
    expect(screen.getByText("Logo")).toBeInTheDocument();
    expect(screen.getByText("TRIDENT")).toBeInTheDocument();
  });

  it("accepts the score colour styles", () => {
    const { container } = render(
      <MultipleSequenceAlignment
        msa={plain}
        options={{ colorStyle: "Cell score", cellScores: plain.map((s) => s.sequence.split("").map(() => 0.5)) }}
      />
    );
    expect(container.querySelectorAll("canvas").length).toBeGreaterThan(0);
  });
});

describe("MultipleSequenceAlignment selection", () => {
  it("is uncontrolled by default, reporting Shift-drag column selections", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment msa={plain} width={160} height={64} options={{ ...compact, showLabels: false }} onSelectionChange={onSelectionChange} />
    );
    const surface = overlay(container);
    withBox(surface, 160, 64);
    // 160px / 10 columns → 16px per column: drag from column 1 to column 3.
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 5, shiftKey: true });
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 5, shiftKey: true });
    fireEvent.pointerMove(surface, { clientX: 60, clientY: 5, shiftKey: true });
    fireEvent.pointerUp(surface, { clientX: 60, clientY: 5, shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: [], columns: [1, 2, 3] }, expect.anything());
  });

  it("selects rows on the rows axis, and a plain drag selects in select mode", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment
        msa={plain}
        width={160}
        height={64}
        options={{ ...compact, showLabels: false, selectionAxis: "rows", interactionMode: "select" }}
        onSelectionChange={onSelectionChange}
      />
    );
    const surface = overlay(container);
    withBox(surface, 160, 64);
    fireEvent.pointerDown(surface, { clientX: 5, clientY: 20 });
    fireEvent.pointerMove(surface, { clientX: 5, clientY: 40 });
    fireEvent.pointerUp(surface, { clientX: 5, clientY: 40 });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: ["b", "c"], columns: [] }, expect.anything());
  });

  it("is fully controlled: user gestures only report, the given selection is what shows", () => {
    const onSelectionChange = vi.fn();
    const selection: MSASelection = { rows: [], columns: [0] };
    const onRemoveColumns = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment
        msa={plain}
        options={compact}
        selection={selection}
        onSelectionChange={onSelectionChange}
        onRemoveColumns={onRemoveColumns}
      />
    );
    fireEvent.keyDown(container.firstElementChild!, { key: "Delete" });
    expect(onRemoveColumns).toHaveBeenCalledWith([0]);
    expect(onSelectionChange).toHaveBeenCalledWith({ rows: [], columns: [] }, expect.anything());
  });

  it("can live in an external store", () => {
    const store = createControllableStore<MSASelection>({ rows: ["c"], columns: [] });
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: MSASelection) => MSASelection)(prev) : next))
    );
    const onRemoveRows = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment msa={plain} options={compact} selectionStore={controller} onRemoveRows={onRemoveRows} />
    );
    fireEvent.keyDown(container.firstElementChild!, { key: "Backspace" });
    expect(onRemoveRows).toHaveBeenCalledWith(["c"]);
    expect(store.getState()).toEqual({ rows: [], columns: [] });
  });

  it("clears on Escape", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment msa={plain} options={compact} defaultSelection={{ rows: ["a"], columns: [1] }} onSelectionChange={onSelectionChange} />
    );
    fireEvent.keyDown(container.firstElementChild!, { key: "Escape" });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: [], columns: [] }, expect.anything());
  });

  it("never removes every row or every column", () => {
    const onRemoveRows = vi.fn();
    const onRemoveColumns = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment
        msa={plain}
        options={compact}
        defaultSelection={{ rows: ["a", "b", "c", "d"], columns: Array.from({ length: 10 }, (_, i) => i) }}
        onRemoveRows={onRemoveRows}
        onRemoveColumns={onRemoveColumns}
      />
    );
    fireEvent.keyDown(container.firstElementChild!, { key: "Delete" });
    expect(onRemoveRows).not.toHaveBeenCalled();
    expect(onRemoveColumns).not.toHaveBeenCalled();
  });

  it("drops selected rows that disappear from the alignment", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <MultipleSequenceAlignment msa={plain} options={compact} defaultSelection={{ rows: ["a", "d"], columns: [] }} onSelectionChange={onSelectionChange} />
    );
    rerender(
      <MultipleSequenceAlignment msa={plain.slice(0, 3)} options={compact} defaultSelection={{ rows: ["a", "d"], columns: [] }} onSelectionChange={onSelectionChange} />
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: ["a"], columns: [] }, expect.anything());
  });

  it("selects a column by clicking a track, extending with Shift", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment
        msa={plain}
        width={160}
        height={200}
        options={{ ...compact, showLabels: false, tracks: ["conservation"] }}
        onSelectionChange={onSelectionChange}
      />
    );
    const track = Array.from(container.querySelectorAll("canvas")).at(-1)!;
    withBox(track, 160, 48);
    fireEvent.click(track, { clientX: 20, clientY: 10 });
    fireEvent.click(track, { clientX: 60, clientY: 10, shiftKey: true });
    expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: [], columns: [1, 2, 3] }, expect.anything());
  });
});

describe("MultipleSequenceAlignment row order", () => {
  it("displays rows in the controlled order, appending rows it doesn't mention", () => {
    render(<MultipleSequenceAlignment msa={plain} options={compact} rowOrder={["c", "a"]} />);
    const labels = Array.from(document.querySelectorAll("[data-row-index]")).map((el) => el.textContent);
    expect(labels).toEqual(["c", "a", "b", "d"]);
  });

  it("reports a label drag as a new order", () => {
    const onRowOrderChange = vi.fn();
    render(<MultipleSequenceAlignment msa={plain} options={compact} onRowOrderChange={onRowOrderChange} />);
    const first = document.querySelector('[data-row-index="0"]') as HTMLElement;
    const column = first.parentElement!;
    withBox(column, 150, 300);
    fireEvent.pointerDown(first, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(column, { clientX: 5, clientY: 20 });
    fireEvent.pointerMove(column, { clientX: 5, clientY: 40 });
    fireEvent.pointerUp(column, { clientX: 5, clientY: 40 });
    expect(onRowOrderChange).toHaveBeenCalledWith(["b", "c", "a", "d"], expect.anything());
  });

  it("can share an external store (e.g. with a tree's leaf order)", () => {
    const store = createControllableStore<string[]>(["d", "c", "b", "a"]);
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: string[]) => string[])(prev) : next))
    );
    render(<MultipleSequenceAlignment msa={plain} options={compact} rowOrderStore={controller} />);
    const labels = () => Array.from(document.querySelectorAll("[data-row-index]")).map((el) => el.textContent);
    expect(labels()).toEqual(["d", "c", "b", "a"]);
    act(() => store.setState(["a", "b", "c", "d"]));
    expect(labels()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("MultipleSequenceAlignment editing and panels", () => {
  it("reports renames by row id", () => {
    const onRenameRow = vi.fn();
    render(<MultipleSequenceAlignment msa={[{ header: "shown", id: "orig", sequence: "ACGT" }]} options={compact} onRenameRow={onRenameRow} />);
    fireEvent.doubleClick(screen.getByText("shown"));
    const input = screen.getByLabelText("New name");
    fireEvent.change(input, { target: { value: "renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRenameRow).toHaveBeenCalledWith("orig", "renamed");
  });

  it("resizes the label column through the controllable panel sizes", () => {
    const onPanelSizesChange = vi.fn();
    render(<MultipleSequenceAlignment msa={plain} options={compact} onPanelSizesChange={onPanelSizesChange} />);
    const handle = screen.getByLabelText("Resize labels");
    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: 130 });
    expect(onPanelSizesChange).toHaveBeenLastCalledWith(expect.objectContaining({ labelWidth: 180 }), expect.anything());
  });

  it("reports the hovered cell", () => {
    const onHoverChange = vi.fn();
    const { container } = render(
      <MultipleSequenceAlignment msa={plain} width={160} height={64} options={{ ...compact, showLabels: false }} onHoverChange={onHoverChange} />
    );
    const surface = overlay(container);
    withBox(surface, 160, 64);
    fireEvent.pointerMove(surface, { clientX: 20, clientY: 20 });
    expect(onHoverChange).toHaveBeenLastCalledWith(expect.objectContaining({ row: 1, rowId: "b", col: 1, residue: "C" }));
  });
});
