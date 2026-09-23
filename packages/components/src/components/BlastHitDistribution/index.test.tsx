import { fireEvent, render, screen } from "@testing-library/react";
import { createControllableStore, createZustandStoreController, type Viewport } from "@react-bio-viz/core";
import { describe, expect, it, vi } from "vitest";

import { BlastHitDistribution } from "./index";
import type { BlastHit, HitSelection } from "./types";

const hits: BlastHit[] = [
  { id: "h1", queryId: "q1", subjectId: "subject-a", queryStart: 10, queryEnd: 200, evalue: 1e-30, bitScore: 300, percentIdentity: 99 },
  { id: "h2", queryId: "q1", subjectId: "subject-b", queryStart: 150, queryEnd: 350, evalue: 1e-5, bitScore: 80, percentIdentity: 72 }, // overlaps h1
  { id: "h3", queryId: "q1", subjectId: "subject-c", queryStart: 500, queryEnd: 600, evalue: 1e-10, bitScore: 150, percentIdentity: 85 },
];

describe("BlastHitDistribution", () => {
  it("renders one rect per hit without throwing", () => {
    const { container } = render(<BlastHitDistribution hits={hits} queryLength={1000} width={800} />);
    expect(container.querySelectorAll("rect[data-pan-ignore]")).toHaveLength(3);
  });

  it("stacks overlapping hits onto separate rows", () => {
    render(<BlastHitDistribution hits={hits} queryLength={1000} width={800} />);
    const h1Y = screen.getByTestId("hit-h1").getAttribute("y");
    const h2Y = screen.getByTestId("hit-h2").getAttribute("y");
    const h3Y = screen.getByTestId("hit-h3").getAttribute("y");
    expect(h1Y).not.toBe(h2Y); // h1 and h2 overlap on the query axis
    expect(h3Y).toBe(h1Y); // h3 starts after h1 ends, reuses its row
  });

  it("toggles a hit into the uncontrolled selection on click, calling onSelectionChange", () => {
    const onSelectionChange = vi.fn();
    render(<BlastHitDistribution hits={hits} queryLength={1000} width={800} onSelectionChange={onSelectionChange} />);
    fireEvent.click(screen.getByTestId("hit-h1"));
    expect(onSelectionChange).toHaveBeenCalledWith({ selectedHitIds: ["h1"] }, { source: "internal" });
    expect(screen.getByTestId("hit-h1")).toHaveAttribute("data-selected", "true");

    fireEvent.click(screen.getByTestId("hit-h1"));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ selectedHitIds: [] }, { source: "internal" });
    expect(screen.getByTestId("hit-h1")).not.toHaveAttribute("data-selected");
  });

  it("renders a fully controlled selection", () => {
    const selection: HitSelection = { selectedHitIds: ["h2"] };
    render(<BlastHitDistribution hits={hits} queryLength={1000} width={800} selection={selection} onSelectionChange={() => {}} />);
    expect(screen.getByTestId("hit-h2")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("hit-h1")).not.toHaveAttribute("data-selected");
  });

  it("delegates selection state to an external Zustand store", () => {
    const store = createControllableStore<HitSelection>({ selectedHitIds: [] });
    const controller = createZustandStoreController(
      store,
      (s) => s,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: HitSelection) => HitSelection)(prev) : next))
    );
    render(<BlastHitDistribution hits={hits} queryLength={1000} width={800} selectionStore={controller} />);
    fireEvent.click(screen.getByTestId("hit-h3"));
    expect(store.getState().selectedHitIds).toEqual(["h3"]);
  });

  it("renders a fully controlled viewport", () => {
    const viewport: Viewport = { x0: 0, x1: 500, y0: 0, y1: 1, xMin: 0, xMax: 1000, yMin: 0, yMax: 1 };
    render(<BlastHitDistribution hits={hits} queryLength={1000} viewport={viewport} onViewportChange={() => {}} />);
    expect(screen.getByTestId("hit-h1")).toBeInTheDocument();
  });

  it("delegates viewport state to an external Zustand store", () => {
    const store = createControllableStore<Viewport>({ x0: 0, x1: 1000, y0: 0, y1: 1, xMin: 0, xMax: 1000, yMin: 0, yMax: 1 });
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: Viewport) => Viewport)(prev) : next))
    );
    render(<BlastHitDistribution hits={hits} queryLength={1000} viewportStore={controller} />);
    expect(screen.getByTestId("hit-h1")).toBeInTheDocument();
  });

  it("switches the color metric via the selector, uncontrolled by default", () => {
    // h1 ranks best by evalue but worst by bitScore, so its color must differ between the two.
    const rankReversedHits: BlastHit[] = [
      { id: "h1", queryId: "q1", subjectId: "subject-a", queryStart: 10, queryEnd: 200, evalue: 1e-30, bitScore: 50, percentIdentity: 90 },
      { id: "h2", queryId: "q1", subjectId: "subject-b", queryStart: 500, queryEnd: 600, evalue: 1e-5, bitScore: 300, percentIdentity: 90 },
    ];
    render(<BlastHitDistribution hits={rankReversedHits} queryLength={1000} width={800} />);
    const h1FillByEvalue = screen.getByTestId("hit-h1").getAttribute("fill");
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Bit score"));
    const h1FillByBitScore = screen.getByTestId("hit-h1").getAttribute("fill");
    expect(h1FillByEvalue).not.toBe(h1FillByBitScore);
  });
});
