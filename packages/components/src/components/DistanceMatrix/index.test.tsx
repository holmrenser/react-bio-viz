import { act, fireEvent, render, screen } from "@testing-library/react";
import { createControllableStore, createZustandStoreController } from "@react-bio-viz/core";
import { describe, expect, it, vi } from "vitest";

import { DistanceMatrix } from "./index";

const labels = ["a", "b", "c"];
const matrix = [
  [0, 0.1, 0.4],
  [0.1, 0, 0.3],
  [0.4, 0.3, 0],
];
const rowLabels = () => Array.from(document.querySelectorAll("[data-row-index]")).map((el) => el.textContent);

function withBox(element: Element, width: number, height: number) {
  element.getBoundingClientRect = () => ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) });
}

describe("DistanceMatrix", () => {
  it("renders row names, column names and one canvas", () => {
    const { container } = render(<DistanceMatrix labels={labels} matrix={matrix} labelNames={{ b: "beta" }} />);
    expect(rowLabels()).toEqual(["a", "beta", "c"]);
    expect(Array.from(container.querySelectorAll("svg text > title")).map((t) => t.textContent)).toEqual(["a", "beta", "c"]);
    expect(container.querySelectorAll("canvas")).toHaveLength(1);
  });

  it("orders rows and columns by a controlled rowOrder", () => {
    render(<DistanceMatrix labels={labels} matrix={matrix} rowOrder={["c", "a"]} />);
    expect(rowLabels()).toEqual(["c", "a", "b"]);
  });

  it("reports a label drag as a new order when uncontrolled", () => {
    const onRowOrderChange = vi.fn();
    render(<DistanceMatrix labels={labels} matrix={matrix} onRowOrderChange={onRowOrderChange} />);
    const first = document.querySelector('[data-row-index="0"]') as HTMLElement;
    const column = first.parentElement!;
    withBox(column, 160, 300);
    fireEvent.pointerDown(first, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(column, { clientX: 5, clientY: 30 });
    fireEvent.pointerMove(column, { clientX: 5, clientY: 50 });
    fireEvent.pointerUp(column, { clientX: 5, clientY: 50 });
    expect(onRowOrderChange.mock.calls[0][0]).toEqual(["b", "c", "a"]);
    expect(rowLabels()).toEqual(["b", "c", "a"]);
  });

  it("shares a row-order store", () => {
    const store = createControllableStore<string[]>(["b", "a", "c"]);
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: string[]) => string[])(prev) : next))
    );
    render(<DistanceMatrix labels={labels} matrix={matrix} rowOrderStore={controller} />);
    expect(rowLabels()).toEqual(["b", "a", "c"]);
    act(() => store.setState(["c", "b", "a"]));
    expect(rowLabels()).toEqual(["c", "b", "a"]);
  });

  it("reports the hovered pair and its distance", () => {
    const onHoverChange = vi.fn();
    const { container } = render(
      <DistanceMatrix labels={labels} matrix={matrix} width={400} options={{ showLabels: false }} onHoverChange={onHoverChange} />
    );
    const canvas = container.querySelector("canvas")!;
    withBox(canvas, 400, 300);
    // 44 × 22 px cells: column 2, row 0.
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 10 });
    expect(onHoverChange).toHaveBeenLastCalledWith(expect.objectContaining({ rowId: "a", columnId: "c", value: 0.4 }));
    expect(screen.getByText("a × c: 0.400")).toBeInTheDocument();
  });

  it("keeps its canvas the size of the widget for a large matrix", () => {
    const many = Array.from({ length: 2000 }, (_, i) => `s${i}`);
    const big = many.map((_, i) => many.map((__, j) => Math.abs(i - j) / 2000));
    const { container } = render(<DistanceMatrix labels={many} matrix={big} width={600} height={400} />);
    const canvas = container.querySelector("canvas")!;
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(600 * 400 * 4);
    expect(document.querySelectorAll("[data-row-index]").length).toBeLessThan(30);
  });

  it("resizes the label column through panel sizes", () => {
    const onPanelSizesChange = vi.fn();
    render(<DistanceMatrix labels={labels} matrix={matrix} onPanelSizesChange={onPanelSizesChange} />);
    const handle = screen.getByLabelText("Resize labels");
    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: 60 });
    expect(onPanelSizesChange.mock.calls.at(-1)[0]).toEqual({ labelWidth: 120 });
  });
});
