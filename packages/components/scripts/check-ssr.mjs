/**
 * Server-rendering smoke test for the built bundles:
 *
 * - import `main` in plain Node (no DOM) and render every component to a string, so nothing touches
 *   `document`/`window` at import or render time;
 * - check that `main` is marked `"use client"`, so React Server Components (the Next.js App Router)
 *   import it as a client reference instead of evaluating it on the server;
 * - import `utils` the way a Server Component does — under the `react-server` condition, where React
 *   has no hooks — and call a helper, so the pure helpers stay usable on the server;
 * - `require` both CommonJS builds, which Node reads as CommonJS only by their `.cjs` extension.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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

const props = {
  MultipleSequenceAlignment: { msa: [{ identifier: "a", sequence: "ACGT" }, { identifier: "b", sequence: "ACGA" }] },
  PhyloTree: { tree },
  DistanceMatrix: { labels: ["a", "b"], matrix: [[0, 0.1], [0.1, 0]] },
  GeneModel: { gene },
  GenomeBrowser: { tracks: [], referenceLength: 1000 },
  BlastHitDistribution: { hits: [], queryLength: 1000 },
};
// Every component, wrapper and Simple* view alike.
const cases = Object.fromEntries(
  Object.entries(props).flatMap(([name, value]) => [
    [name, value],
    [`Simple${name}`, value],
  ])
);

let failed = false;
function fail(message) {
  failed = true;
  console.error(message);
}

for (const file of ["main.es.js", "main.cjs"]) {
  const source = readFileSync(new URL(`../dist/${file}`, import.meta.url), "utf8");
  if (!/^["']use client["'];/.test(source)) fail(`dist/${file} does not start with "use client".`);
}

const require = createRequire(import.meta.url);
for (const [file, name] of [["main.cjs", "PhyloTree"], ["utils.cjs", "parseNewick"]]) {
  try {
    if (typeof require(`../dist/${file}`)[name] !== "function") throw new Error(`no ${name} export`);
  } catch (error) {
    fail(`Requiring dist/${file} failed: ${error instanceof Error ? error.message : error}`);
  }
}

const serverImport = `
  const utils = await import(process.argv[1]);
  if (utils.toNewick(utils.parseNewick("(A:1,B:2);")) !== "(A:1,B:2);") throw new Error("wrong result");
`;
const server = spawnSync(
  process.execPath,
  ["--conditions=react-server", "--input-type=module", "-e", serverImport, new URL("../dist/utils.es.js", import.meta.url).href],
  { encoding: "utf8" }
);
if (server.status !== 0) fail(`Importing react-bio-viz/utils under the react-server condition failed:\n${server.stderr}`);

for (const [name, props] of Object.entries(cases)) {
  try {
    const html = renderToString(createElement(bundle[name], props));
    if (!html) throw new Error("rendered nothing");
  } catch (error) {
    fail(`SSR render of ${name} failed: ${error instanceof Error ? error.message : error}`);
  }
}
if (failed) process.exit(1);
console.log(
  `SSR check: ${Object.keys(cases).length} components render on the server, main is "use client", ` +
    "utils runs under react-server, and the CommonJS builds load."
);
