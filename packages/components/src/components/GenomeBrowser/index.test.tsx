import { render, screen } from "@testing-library/react";
import { createControllableStore, createZustandStoreController, type Viewport } from "@react-bio-viz/core";
import { describe, expect, it } from "vitest";

import type { SequenceInterval } from "../GeneModel/types";
import { GenomeBrowser } from "./index";
import type { CoverageTrack, FeatureTrack, GeneModelTrack, GenomeTrack } from "./types";

const featureTrack: FeatureTrack = {
  id: "features",
  label: "Features",
  kind: "feature",
  data: [
    { id: "f1", start: 100, end: 300, label: "feature-1" },
    { id: "f2", start: 250, end: 500, label: "feature-2" }, // overlaps f1, forces row-stacking
    { id: "f3", start: 600, end: 700, label: "feature-3" },
  ],
};

const coverageTrack: CoverageTrack = {
  id: "coverage",
  label: "Coverage",
  kind: "coverage",
  data: [
    { position: 0, value: 1 },
    { position: 500, value: 10 },
    { position: 1000, value: 3 },
  ],
};

const gene: SequenceInterval = {
  ID: "gene1",
  seqid: "chr1",
  source: "test",
  interval_type: "gene",
  start: 100,
  end: 900,
  score: ".",
  strand: "+",
  phase: ".",
  attributes: {},
  children: [
    { ID: "mrna1", seqid: "chr1", source: "test", interval_type: "mRNA", start: 100, end: 900, score: ".", strand: "+", phase: ".", attributes: { parent: ["gene1"] } },
    { ID: "exon1", seqid: "chr1", source: "test", interval_type: "exon", start: 100, end: 400, score: ".", strand: "+", phase: ".", attributes: { parent: ["mrna1"] } },
    { ID: "cds1", seqid: "chr1", source: "test", interval_type: "CDS", start: 150, end: 350, score: ".", strand: "+", phase: 0, attributes: { parent: ["mrna1"] } },
  ],
};
const geneModelTrack: GeneModelTrack = { id: "gene-track", label: "Gene", kind: "genemodel", data: gene };

const tracks: GenomeTrack[] = [featureTrack, coverageTrack, geneModelTrack];

describe("GenomeBrowser", () => {
  it("renders all three built-in track kinds without throwing", () => {
    const { container } = render(<GenomeBrowser tracks={tracks} referenceLength={1000} width={800} />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("Gene")).toBeInTheDocument();
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  it("stacks overlapping features onto separate rows", () => {
    const { container } = render(<GenomeBrowser tracks={[featureTrack]} referenceLength={1000} width={800} />);
    expect(container.querySelectorAll("rect[data-pan-ignore]")).toHaveLength(3);
  });

  it("renders fully controlled", () => {
    const viewport: Viewport = { x0: 0, x1: 500, y0: 0, y1: 1, xMin: 0, xMax: 1000, yMin: 0, yMax: 1 };
    render(<GenomeBrowser tracks={tracks} referenceLength={1000} viewport={viewport} onViewportChange={() => {}} />);
    expect(screen.getByText("Features")).toBeInTheDocument();
  });

  it("renders with an external Zustand store", () => {
    const store = createControllableStore<Viewport>({ x0: 0, x1: 1000, y0: 0, y1: 1, xMin: 0, xMax: 1000, yMin: 0, yMax: 1 });
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: Viewport) => Viewport)(prev) : next))
    );
    render(<GenomeBrowser tracks={tracks} referenceLength={1000} viewportStore={controller} />);
    expect(screen.getByText("Features")).toBeInTheDocument();
  });

  it("lets a custom trackRenderer override a built-in kind", () => {
    render(
      <GenomeBrowser
        tracks={[featureTrack]}
        referenceLength={1000}
        trackRenderers={{ feature: () => <text data-testid="custom">custom!</text> }}
      />
    );
    expect(screen.getByText("custom!")).toBeInTheDocument();
  });
});
