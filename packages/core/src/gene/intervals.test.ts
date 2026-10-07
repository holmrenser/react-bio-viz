import { describe, expect, it } from "vitest";

import { getTranscriptParts, getTranscripts } from "./intervals";
import type { Annotation } from "../data";

function feature(ID: string, interval_type: string, parent?: string[] | string): Annotation {
  return {
    ID,
    seqid: "chr1",
    source: "test",
    interval_type,
    start: 0,
    end: 10,
    score: ".",
    strand: "+",
    phase: ".",
    attributes: parent === undefined ? {} : { parent },
    children: [],
  };
}

const gene: Annotation = {
  ...feature("gene1", "gene"),
  children: [
    feature("mrna1", "mRNA", ["gene1"]),
    feature("mrna10", "mRNA", ["gene1"]),
    feature("cds1", "CDS", ["mrna1"]),
    feature("exon1", "exon", ["mrna1"]),
    feature("exon2", "exon", "mrna1"),
    feature("exon10", "exon", "mrna10"),
  ],
};

describe("getTranscripts", () => {
  it("returns the gene's mRNA children", () => {
    expect(getTranscripts(gene).map((t) => t.ID)).toEqual(["mrna1", "mrna10"]);
  });

  it("returns nothing for a gene with no children", () => {
    expect(getTranscripts(feature("g", "gene"))).toEqual([]);
  });
});

describe("getTranscriptParts", () => {
  it("returns a transcript's parts with CDSs last, so they draw on top", () => {
    const [mrna1] = getTranscripts(gene);
    expect(getTranscriptParts(gene, mrna1).map((p) => p.ID)).toEqual(["exon1", "exon2", "cds1"]);
  });

  it("matches a string parent exactly, not as a substring", () => {
    const [mrna1, mrna10] = getTranscripts(gene);
    expect(getTranscriptParts(gene, mrna1).map((p) => p.ID)).not.toContain("exon10");
    expect(getTranscriptParts(gene, mrna10).map((p) => p.ID)).toEqual(["exon10"]);
  });
});
