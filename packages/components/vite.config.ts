import { defineConfig, type Plugin, type UserConfig } from "vite";
import { copyFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";

/**
 * Two bundles, built one after the other (`vite build && vite build --mode utils`):
 *
 * - `main`, the components. They are client components, so the bundle starts with `"use client"`
 *   and React Server Components (the Next.js App Router) import it as a client reference. Rollup
 *   drops module-level directives when it bundles, so the banner adds it back.
 * - `utils`, the pure helpers, with no directive and no React, so they also run on the server.
 *
 * Not one build with two entries: `@react-bio-viz/core` arrives as a single prebuilt module, which
 * Rollup would put in a chunk shared by both entries — dragging React's hooks into `utils`. The
 * `utils` build reads core from source instead, so only the helpers it uses reach the bundle.
 */
export default defineConfig(({ mode }) => (mode === "utils" ? utilsConfig : mainConfig));

const external = ["react", "react/jsx-runtime", "react-dom"];
/** `.cjs` for CommonJS: the package is `"type": "module"`, so Node reads every `.js` file as ESM. */
const libFileName = (format: string, entryAlias: string) => `${entryAlias}.${format === "cjs" ? "cjs" : "es.js"}`;

const mainConfig: UserConfig = {
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      tsconfigPath: "./tsconfig.json",
      // One self-contained `main.d.ts`: `@react-bio-viz/core` is bundled into the JS, so its types
      // are inlined too — consumers never install it. The same goes for the betula data types,
      // which are type-only: `betula-schema`'s validators never reach the bundle.
      rollupTypes: true,
      bundledPackages: ["@react-bio-viz/core", "betula-schema"],
      // The same declarations for `require`: TypeScript reads a `.d.ts` in a `"type": "module"`
      // package as ESM, so CommonJS consumers get a `.d.cts`.
      afterBuild: () => copyFileSync(resolve(__dirname, "dist/main.d.ts"), resolve(__dirname, "dist/main.d.cts")),
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["es", "cjs"],
      fileName: libFileName,
    },
    copyPublicDir: false,
    rollupOptions: {
      external,
      output: { banner: '"use client";' },
    },
  },
};

const utilsConfig: UserConfig = {
  plugins: [coreFromSource(), utilsDeclarations()],
  resolve: {
    alias: [
      { find: /^@react-bio-viz\/core$/, replacement: resolve(__dirname, "../core/src/main.ts") },
      { find: /^@\//, replacement: resolve(__dirname, "../core/src") + "/" },
    ],
  },
  build: {
    lib: {
      entry: { utils: resolve(__dirname, "src/utils.ts") },
      formats: ["es", "cjs"],
      fileName: libFileName,
    },
    copyPublicDir: false,
    // Adds to the `main` build's output.
    emptyOutDir: false,
    rollupOptions: {
      external,
      // Keep a module only for the exports used: core's other modules (React contexts, the
      // stylesheet) run code at import, and none of it belongs on the server.
      treeshake: { moduleSideEffects: false },
      // Reading core from source parses its UI dependencies, whose `"use client"` is dropped here
      // anyway: none of them reach the bundle.
      onwarn(warning, warn) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
    },
  },
};

/**
 * Reading core from source: its stylesheet belongs to the components, so the helpers have none to
 * emit, and the `"use client"` of its UI modules would be dropped anyway — none of them reach the
 * bundle — so remove it before Rollup warns about it.
 */
function coreFromSource(): Plugin {
  const id = "\0rbv-no-css";
  const coreSource = resolve(__dirname, "../core/src");
  return {
    name: "rbv-core-from-source",
    enforce: "pre",
    resolveId: (source) => (source.endsWith(".css") ? id : null),
    load: (source) => (source === id ? { code: "", moduleSideEffects: false } : null),
    transform: (code, source) =>
      source.startsWith(coreSource) ? code.replace(/^["']use client["'];?/, "") : null,
  };
}

/**
 * `utils.d.ts` (and `utils.d.cts`): `main.d.ts` is already self-contained and exports every helper,
 * so the helpers' types are re-exported from there rather than rolled up a second time.
 */
function utilsDeclarations(): Plugin {
  return {
    name: "rbv-utils-declarations",
    writeBundle(options, bundle) {
      const entry = Object.values(bundle).find((chunk) => chunk.type === "chunk" && chunk.isEntry);
      if (!entry || entry.type !== "chunk") return;
      const names = [...entry.exports].sort().join(",\n  ");
      for (const [file, main] of [["utils.d.ts", "./main.js"], ["utils.d.cts", "./main.cjs"]]) {
        writeFileSync(resolve(options.dir ?? "dist", file), `export {\n  ${names},\n} from "${main}";\n`);
      }
    },
  };
}
