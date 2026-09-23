import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(here, "src/react_bio_viz/static");

await mkdir(outdir, { recursive: true });

/**
 * Unlike the npm packages — which leave React external for the host app to provide — the widget
 * bundle has to be self-contained: anywidget loads `_esm` as a standalone ES module in the
 * notebook's page, with no bundler and no import map to resolve bare specifiers against.
 *
 * One bundle serves all five widgets, dispatching on the `_component` trait, so React ships once
 * in the wheel instead of five times.
 */
await build({
  entryPoints: [resolve(here, "js/widget.tsx")],
  outfile: resolve(outdir, "widget.js"),
  bundle: true,
  format: "esm",
  target: "es2020",
  minify: true,
  sourcemap: false,
  jsx: "automatic",
  // React libraries branch on this; without it esbuild keeps the dev-only paths (and the
  // `process` reference they sit behind, which does not exist in a browser).
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "css" },
  logLevel: "info",
});

console.log(`built ${outdir}/widget.js (+ widget.css)`);
