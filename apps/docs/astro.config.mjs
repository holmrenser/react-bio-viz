// @ts-check
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

/**
 * Deployed to GitHub Pages as a project site, so every URL lives under `/react-bio-viz/`. Override
 * with DOCS_SITE / DOCS_BASE to host it elsewhere (e.g. DOCS_BASE=/ for a custom domain).
 */
const site = process.env.DOCS_SITE ?? "https://holmrenser.github.io";
const base = process.env.DOCS_BASE ?? "/react-bio-viz";

export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      title: "react-bio-viz",
      description: "React components and Jupyter widgets for biological data visualization.",
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/holmrenser/react-bio-viz" }],
      editLink: { baseUrl: "https://github.com/holmrenser/react-bio-viz/edit/main/apps/docs/" },
      customCss: ["./src/styles/custom.css"],
      // Search is built by Pagefind, a native binary. DOCS_SEARCH=false skips it for machines where
      // it can't run (its linux-arm64 build crashes on kernels with 16K/64K memory pages).
      pagefind: process.env.DOCS_SEARCH !== "false",
      head: [
        {
          // The components follow a `dark` class on <html> (the shadcn convention); Starlight marks its
          // theme with `data-theme`. Mirror one onto the other, before first paint and on every toggle.
          tag: "script",
          content: `(() => {
  const root = document.documentElement;
  const sync = () => root.classList.toggle("dark", root.dataset.theme === "dark");
  sync();
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();`,
        },
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: ["../../packages/components/src/main.ts"],
          tsconfig: "./tsconfig.typedoc.json",
          output: "reference",
          sidebar: { label: "API reference", collapsed: true },
          typeDoc: {
            excludeExternals: false,
            excludePrivate: true,
            excludeInternal: true,
            readme: "none",
            // "Defined in" links point at the source on GitHub rather than a local path; `{path}` is
            // relative to the repository root.
            gitRevision: "main",
            basePath: "../..",
            sourceLinkTemplate: "https://github.com/holmrenser/react-bio-viz/blob/{gitRevision}/{path}#L{line}",
            groupOrder: ["Components", "Component props", "Functions", "Interfaces", "Type Aliases", "Variables", "*"],
            // typedoc-plugin-markdown: props and parameters as tables, which scan far better than
            // one heading per prop.
            parametersFormat: "table",
            interfacePropertiesFormat: "table",
            typeDeclarationFormat: "table",
            useCodeBlocks: true,
            // Source order keeps each state's value/default/on-change/store props together, in the
            // order the types are written, instead of scattering them alphabetically.
            sort: ["source-order"],
            tableColumnSettings: { hideSources: true },
          },
        }),
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Introduction", slug: "index" },
            { label: "Getting started", slug: "getting-started" },
          ],
        },
        { label: "Concepts", items: [{ autogenerate: { directory: "concepts" } }] },
        { label: "Components", items: [{ autogenerate: { directory: "components" } }] },
        { label: "Guides", items: [{ autogenerate: { directory: "guides" } }] },
        { label: "Python & Jupyter", items: [{ autogenerate: { directory: "python" } }] },
        typeDocSidebarGroup,
      ],
    }),
    react(),
  ],
});
