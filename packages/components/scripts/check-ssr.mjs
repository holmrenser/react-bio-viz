/**
 * Server-rendering smoke test for the built bundle: import it in plain Node (no DOM) and render every
 * component to a string. Catches anything that touches `document`/`window` at import or render time,
 * which would break the package in server-rendered apps. Run after `vite build`.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const bundle = await import(new URL("../dist/main.es.js", import.meta.url));

const tree = {
  name: "",
  length: 0,
  children: [
    { name: "A", length: 1, children: [] },
    { name: "90", length: 1, children: [{ name: "B", length: 1, children: [] }, { name: "C", length: 2, children: [] }] },
  ],
};
const gene = {
  ID: "g1", seqid: "chr1", source: "x", interval_type: "gene", start: 100, end: 900, score: ".", strand: "+",
  phase: ".", attributes: {},
  children: [{ ID: "t1", seqid: "chr1", source: "x", interval_type: "mRNA", start: 100, end: 900, score: ".",
    strand: "+", phase: ".", attributes: {}, parents: ["g1"],
    children: [{ ID: "e1", seqid: "chr1", source: "x", interval_type: "exon", start: 100, end: 400, score: ".",
      strand: "+", phase: ".", attributes: {}, parents: ["t1"], children: [] }] }],
};

const cases = {
  MultipleSequenceAlignment: { msa: [{ header: "a", sequence: "ACGT" }, { header: "b", sequence: "ACGA" }] },
  PhyloTree: { tree },
  DistanceMatrix: { labels: ["a", "b"], matrix: [[0, 0.1], [0.1, 0]] },
  GeneModel: { gene },
  GenomeBrowser: { tracks: [], referenceLength: 1000 },
  BlastHitDistribution: { hits: [], queryLength: 1000 },
};

let failed = false;
for (const [name, props] of Object.entries(cases)) {
  try {
    const html = renderToString(createElement(bundle[name], props));
    if (!html) throw new Error("rendered nothing");
  } catch (error) {
    failed = true;
    console.error(`SSR render of ${name} failed: ${error instanceof Error ? error.message : error}`);
  }
}
if (failed) process.exit(1);
console.log(`SSR check: bundle imports and ${Object.keys(cases).length} components render on the server.`);
