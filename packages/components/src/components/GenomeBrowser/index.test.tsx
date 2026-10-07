import { fireEvent, render, screen } from "@testing-library/react";
import { createControllableStore, type Annotation, type Viewport } from "@react-bio-viz/core";
import { describe, expect, it, vi } from "vitest";

import { GenomeBrowser, SimpleGenomeBrowser } from "./index";
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

const gene: Annotation = {
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
    { ID: "mrna1", seqid: "chr1", source: "test", interval_type: "mRNA", start: 100, end: 900, score: ".", strand: "+", phase: ".", attributes: { parent: ["gene1"] }, children: [] },
    { ID: "exon1", seqid: "chr1", source: "test", interval_type: "exon", start: 100, end: 400, score: ".", strand: "+", phase: ".", attributes: { parent: ["mrna1"] }, children: [] },
    { ID: "cds1", seqid: "chr1", source: "test", interval_type: "CDS", start: 150, end: 350, score: ".", strand: "+", phase: 0, attributes: { parent: ["mrna1"] }, children: [] },
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
    render(<GenomeBrowser tracks={tracks} referenceLength={1000} viewportStore={store} />);
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

  it("draws each gene-model track's arrowheads from a marker of its own", () => {
    const { container } = render(
      <GenomeBrowser tracks={[geneModelTrack, { ...geneModelTrack, id: "gene-track-2" }]} referenceLength={1000} />
    );
    const markerIds = Array.from(container.querySelectorAll("marker")).map((marker) => marker.id);
    const references = Array.from(container.querySelectorAll("line[marker-end]")).map((line) =>
      line.getAttribute("marker-end")
    );
    expect(new Set(markerIds).size).toBe(2);
    expect(references).toEqual(markerIds.map((id) => `url(#${id})`));
  });
});

describe("SimpleGenomeBrowser", () => {
  it("renders the tracks without a toolbar", () => {
    render(<SimpleGenomeBrowser tracks={tracks} referenceLength={1000} />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.queryByLabelText("Zoom in")).not.toBeInTheDocument();
  });

  it("only reports a zoom through onViewportChange", () => {
    const onViewportChange = vi.fn();
    const { container } = render(
      <SimpleGenomeBrowser tracks={tracks} referenceLength={1000} onViewportChange={onViewportChange} />
    );
    fireEvent.wheel(container.querySelectorAll("svg")[1], { deltaY: -200, clientX: 100 });
    const next = onViewportChange.mock.calls.at(-1)?.[0] as Viewport;
    expect(next.x1 - next.x0).toBeLessThan(1000);
  });
});
