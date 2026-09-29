import { defineConfig, type Plugin } from "vite";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import tailwindcss from "@tailwindcss/vite";

/**
 * Tailwind declares its theme variables (`--spacing`, `--font-sans`, …) on `:root, :host`, as does a
 * host page built with Tailwind — often customised. Rewriting ours to `:where(:root, :host)` drops
 * them to zero specificity, so the host's values win whichever stylesheet loads last.
 */
function yieldThemeVariablesToHost(): Plugin {
  return {
    name: "rbv-yield-theme-variables",
    // On the written file: Vite emits the CSS asset after other plugins' `generateBundle` hooks.
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
