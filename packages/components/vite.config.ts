import { defineConfig } from "vite";
import { createRequire } from "module";
import { dirname, resolve } from "path";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";

/**
 * The library build resolves the `browser` export condition, which for these two Emotion packages
 * selects builds that touch `document` as soon as they are imported. Bundled, that made
 * `import "react-bio-viz"` throw in any server-rendered app (Next.js, Remix, Astro — the docs site
 * found it). Their default builds guard every DOM access with `typeof document`, so use those.
 * `scripts/check-ssr.mjs` fails the build if the bundle stops being importable on the server.
 */
const requireFromEmotion = createRequire(createRequire(import.meta.url).resolve("@emotion/css/package.json"));
const ssrSafeEmotion = Object.fromEntries(
  ["cache", "utils"].map((name) => {
    const directory = dirname(requireFromEmotion.resolve(`@emotion/${name}/package.json`));
    return [`@emotion/${name}`, resolve(directory, `dist/emotion-${name}.esm.js`)];
  })
);

export default defineConfig({
  resolve: {
    alias: ssrSafeEmotion,
  },
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      tsconfigPath: "./tsconfig.json",
      // One self-contained `main.d.ts`: `@react-bio-viz/core` is bundled into the JS (it is a
      // devDependency, not a runtime one), so its types must be inlined too or every consumer's
      // type-check would try to resolve a package that is never installed alongside this one.
      rollupTypes: true,
      bundledPackages: ["@react-bio-viz/core"],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      formats: ["es", "cjs"],
      fileName: (format, entryAlias) => `${entryAlias}.${format}.js`,
    },
    copyPublicDir: false,
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react-dom"],
    },
  },
});
