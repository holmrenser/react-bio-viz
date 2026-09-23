import { render, screen } from "@testing-library/react";
import { createControllableStore, createZustandStoreController, type Viewport } from "@react-bio-viz/core";
import { describe, expect, it } from "vitest";

import { GeneModel } from "./index";
import type { SequenceInterval } from "./types";

const gene: SequenceInterval = {
  ID: "gene1",
  seqid: "chr1",
  source: "test",
  interval_type: "gene",
  start: 1000,
  end: 2000,
  score: ".",
  strand: "+",
  phase: ".",
  attributes: {},
  children: [
    {
      ID: "mrna1",
      seqid: "chr1",
      source: "test",
      interval_type: "mRNA",
      start: 1000,
      end: 2000,
      score: ".",
      strand: "+",
      phase: ".",
      attributes: { parent: ["gene1"] },
    },
    {
      ID: "exon1",
      seqid: "chr1",
      source: "test",
      interval_type: "exon",
      start: 1000,
      end: 1500,
      score: ".",
      strand: "+",
      phase: ".",
      attributes: { parent: ["mrna1"] },
    },
    {
      ID: "cds1",
      seqid: "chr1",
      source: "test",
      interval_type: "CDS",
      start: 1000,
      end: 1500,
      score: ".",
      strand: "+",
      phase: 0,
      attributes: { parent: ["mrna1"] },
    },
  ],
};

describe("GeneModel", () => {
  it("renders one popover trigger per exon/CDS feature, uncontrolled", () => {
    const { container } = render(<GeneModel gene={gene} />);
    expect(container.querySelectorAll("rect[data-slot='popover-trigger']")).toHaveLength(2);
  });

  it("renders fully controlled", () => {
    const viewport: Viewport = { x0: 1000, x1: 1500, y0: 0, y1: 1, xMin: 900, xMax: 2100, yMin: 0, yMax: 1 };
    render(<GeneModel gene={gene} viewport={viewport} onViewportChange={() => {}} />);
    expect(screen.getByText("chr1")).toBeInTheDocument();
  });

  it("renders with an external Zustand store", () => {
    const store = createControllableStore<Viewport>({
      x0: 900,
      x1: 2100,
      y0: 0,
      y1: 1,
      xMin: 900,
      xMax: 2100,
      yMin: 0,
      yMax: 1,
    });
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: Viewport) => Viewport)(prev) : next))
    );
    const { container } = render(<GeneModel gene={gene} viewportStore={controller} />);
    expect(container.querySelectorAll("rect[data-slot='popover-trigger']")).toHaveLength(2);
  });

  it("honors the deprecated panMin/panMax props when no viewport is given", () => {
    const { container: full } = render(<GeneModel gene={gene} />);
    const { container: zoomed } = render(<GeneModel gene={gene} panMin={25} panMax={75} />);
    const fullLabels = Array.from(full.querySelectorAll("text")).map((el) => el.textContent);
    const zoomedLabels = Array.from(zoomed.querySelectorAll("text")).map((el) => el.textContent);
    expect(fullLabels).not.toEqual(zoomedLabels);
  });
});
