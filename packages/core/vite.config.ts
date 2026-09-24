import { defineConfig, type Plugin } from "vite";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import tailwindcss from "@tailwindcss/vite";

/**
 * Tailwind emits its theme variables (`--spacing`, `--text-sm`, `--color-*`, …) on `:root, :host`.
 * A host page built with Tailwind emits the same names — often customised (fonts, radii) — in the
 * same `theme` layer, so whichever stylesheet loaded last would silently win. Rewriting our copy to
 * `:where(:root, :host)` drops it to zero specificity: the host's values always take precedence,
 * and ours only fill in variables the host doesn't define.
 */
function yieldThemeVariablesToHost(): Plugin {
  return {
    name: "rbv-yield-theme-variables",
    // Runs on the written file: Vite's own CSS plugin emits the stylesheet asset after other
    // plugins' `generateBundle` hooks, so rewriting it in the bundle is too early.
    writeBundle(options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (!fileName.endsWith(".css")) continue;
        const path = resolve(options.dir ?? "dist", fileName);
        const css = readFileSync(path, "utf8");
        writeFileSync(path, css.replace(/:root,\s*:host\s*\{/g, ":where(:root,:host){"));
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    yieldThemeVariablesToHost(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      tsconfigPath: "./tsconfig.json",
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["es", "cjs"],
      fileName: (format, entryAlias) => `${entryAlias}.${format}.js`,
    },
    cssCodeSplit: false,
    copyPublicDir: false,
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react-dom"],
    },
  },
});
