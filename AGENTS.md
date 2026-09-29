# AGENTS.md

Instructions for AI coding agents (and human contributors) working in this repository.

## What this is

`react-bio-viz` is a monorepo of reusable React components for biological data visualization —
multiple sequence alignments (with conservation and sequence-logo tracks), phylogenetic trees,
distance matrices, gene models, genome browser tracks and BLAST hit distributions — plus a
Python/Jupyter wrapper published to PyPI under the same name.

## Design considerations

- **Simple controlled components.** Every component has a `Simple*` version (`SimplePhyloTree`,
  `SimpleMultipleSequenceAlignment`, …) that holds no state: all of it is passed in as props and
  every change is reported through a callback, so it can be embedded in, and configured by, any
  application.
- **Plug-and-play wrappers.** The unprefixed component (`PhyloTree`) wraps its `Simple*` version and
  adds UI such as the pan/zoom toolbar. It manages the state itself: controlled through props, in an
  external store the caller passes in, or — when neither is given — in its own Zustand store.
- **Consistent data structures** for passing in data, and **consistent, intuitive interfaces**,
  across components.
- **Performance.** Draw only what is on screen; for large data, render to canvas through a viewport,
  in a web worker when needed — see [Viewports and performance](#viewports-and-performance).
- **DRY.** Components are built from the same primitives in `packages/core`, so learning one
  component's state conventions translates to all of them.

## Layout

```
packages/
  core/         @react-bio-viz/core    shared types and state/viewport/color/scale/UI primitives
  components/   react-bio-viz          the visualization components
  python/       react-bio-viz (PyPI)   anywidget-based Jupyter bindings
apps/
  demo/                                Vite playground, not published
  docs/                                documentation site (Astro Starlight), deployed to GitHub Pages
```

Package manager: **pnpm**. `pnpm --filter <pkg> <script>` targets one package; the root scripts run
across all of them. `packages/components` and `apps/demo` consume `@react-bio-viz/core` and
`react-bio-viz` as **built** workspace dependencies (`dist/`), so rebuild a package before expecting
its dependents to pick up source changes — there is no cross-package HMR.

## Module layout

Every component in `packages/components/src/components/` has the same structure:

```
ComponentName/
  index.tsx                 the wrapper component, and the module's public exports
  SimpleComponentName.tsx   the controlled view
  types.ts                  module-specific types (shared data types live in core)
  constants.ts              module constants — no magic numbers inline
  components/               sub-components (PascalCase.tsx)
  hooks/                    custom hooks (useCamelCase.ts)
  utils/                    pure functions, each with a co-located *.test.ts
  layouts/ | tracks/        pluggable renderers (PhyloTree, GenomeBrowser)
```

Pure logic belongs in `utils/` with a test, not inline in a component. Anything used by more than one
component moves up into `packages/core`; never import sideways between component modules.

## State (read before adding or touching any stateful prop)

Each piece of interactive state — a viewport, a selection, a row order — is a group of props named
for it:

```ts
// Simple<Name>Props: the state is only ever passed in
someState?: T;                          // omitted: the view shows its default
onSomeStateChange?: (next: T) => void;

// <Name>Props = Simple<Name>Props, plus for each state
defaultSomeState?: T;                   // seeds the wrapper's own store
someStateStore?: StoreController<T>;    // an external store (Zustand, an anywidget model, …)
```

The wrapper resolves each group with `useControllableState` from core, which keeps uncontrolled
state in a private Zustand store. Every name derives from the state — `viewportStore`, never a bare
`store` — which is what lets the Python bridge bind a trait to its prop by name alone. Edits to the
data (`onRenameRow`, `onRemoveRows`) are events, not state: components never mutate their data
props. Don't invent another convention; load the `bio-viz-conventions` skill
(`.agents/skills/bio-viz-conventions/SKILL.md`) before implementing a stateful component or prop.

## Viewports and performance

- Pan/zoom state is a plain `Viewport`: the visible window `x0..x1`, `y0..y1` within the extent
  `xMin..xMax`, `yMin..yMax`, in data units. `useViewport`, `useDragPan`, `useWheelZoom` and the pure
  `panBy`/`zoomAt`/`clampToExtent` in core are the one pan/zoom implementation.
- Everything costs O(what is on screen). Canvases draw the visible window, never a full-size bitmap
  (browsers silently blank a canvas past ~268 megapixels); SVG bodies are memoised apart from the
  viewport, so panning only changes the `viewBox`; DOM lists (`RowLabels`) are virtualised.
- Where a frame still blocks the main thread, move the drawing into a web worker rendering to an
  `OffscreenCanvas`, driven by the same `Viewport`.

## UI chrome and styling

- **Chrome** (buttons, toolbars, popovers, selects) comes from the shadcn/ui components in
  `packages/core/src/components/ui/`; add new ones there with the `shadcn` CLI. **Visualization
  surfaces** (SVG, canvas) are hand-rolled.
- Style with Tailwind classes or inline styles — no CSS-in-JS. Tailwind compiles at
  `packages/core`'s build into the one shipped stylesheet, scanning `packages/components/src` too, so
  rebuild core after using a new class in a component. No other package needs a Tailwind config.
- Consumers don't import that stylesheet: `packages/components/src/main.ts` inlines it and injects it
  into `<head>` on import (`injectStyleSheet`; a no-op on the server). It is still emitted as
  `react-bio-viz/style.css` for hosts that load it themselves — SSR pages styled before hydration
  (`apps/docs`), strict CSPs without inline styles, and shadow-DOM hosts (the Python widget, via
  anywidget's `_css`).
- The stylesheet must never restyle the host: no Tailwind preflight, no global element rules, tokens
  at zero specificity so the host's win. Put `ROOT_CLASS` (core) on every component root and
  portalled overlay; the element reset is scoped to it.
- Colors: `currentColor` and theme tokens (`text-foreground`, `var(--background)`) rather than
  literals, so components follow the host's theme. The one saturated color, `--rbv-accent`
  (`ACCENT_COLOR`), is reserved for interactive affordances. Canvas can't read CSS variables: it
  takes an explicit `darkMode`, defaulting to `useDarkMode()` (the `dark` class on `<html>`), and
  literal colors such as `ACCENT_LITERAL`.

## Commands

- `pnpm install`; `pnpm build` builds every package in dependency order (core → components → the
  Python widget bundle).
- `pnpm dev` — the demo playground (build the packages first).
- `pnpm test` (Vitest), `pnpm typecheck` (`tsc --noEmit`), `pnpm lint` (one ESLint flat config,
  `eslint.config.js`) — across all packages.
- `pnpm run docs` builds the packages, then the documentation site into `apps/docs/dist`;
  `pnpm docs:dev` serves it with live reload. (`pnpm docs` is a pnpm built-in that never runs the
  script.) Set `DOCS_SEARCH=false` where Pagefind's native binary can't run (linux-arm64 with
  16K/64K memory pages).
- Python, from `packages/python`: `uv pip install -e ".[dev]"`, then `pytest`.

## Documentation

- The API reference is generated by TypeDoc from the TSDoc comments on every docs build
  (`apps/docs/src/content/docs/reference/`, gitignored): a public symbol's doc comment *is* its
  reference page. Tag components `@group Components` and their props `@group Component props`.
- Guides and component pages are MDX in `apps/docs/src/content/docs/`; live examples are React
  components in `apps/docs/src/examples/`, embedded with `client:only="react"` and wrapped in `Demo`
  (which supplies the width). Link between pages with relative links, so the site works under any
  base path.
- A new component, prop or behaviour gets its page or section updated along with the code.
- `packages/components` fails its build if the bundle can't be imported and server-rendered in Node
  (`scripts/check-ssr.mjs`): the site pre-renders every page, and so do consumers' SSR apps.

## Where things live

- `packages/core/src/`: state (`useControllableState`, `createControllableStore`), viewport, color,
  scales and rulers, canvas setup, row labels and layout, SVG export, theme, shared data types and
  their rendering (`gene/`: `SequenceInterval`, `TranscriptStack`), and the shadcn/ui chrome.
- `packages/components/src/components/`: `MultipleSequenceAlignment`, `PhyloTree`, `DistanceMatrix`,
  `GeneModel`, `GenomeBrowser` and `BlastHitDistribution`, each with its `Simple*` view. All are
  exported from `packages/components/src/main.ts`, with the core pieces consumers need
  (`createControllableStore`, `Viewport`, `ViewportToolbar`, …).
- Publishing: `react-bio-viz` bundles `@react-bio-viz/core` (JS and, via `rollupTypes`, its
  declarations) and every other library it uses, so its only runtime requirements are its React peer
  dependencies. Keep bundled libraries in `devDependencies`.
- `packages/python/`: one `AnyWidget` subclass per component in `src/react_bio_viz/`, all rendering
  the wrapper components from one bundle built from `js/` (`widget.tsx` dispatches on the
  `_component` trait; `_storeAdapter.ts` wraps a synced trait as a `StoreController`). A new prop is
  a snake_case trait on the Python class, its name in the component's `props` list in
  `js/widget.tsx`, and a test. Interactive state goes in `stores` instead — bound to the camelCased
  `<trait>Store` prop, and seeded with a non-`None` value (the tests check this). Event callbacks
  (`onRenameRow`, `onNodeClick`, …) go in `events`, sending a custom message that an `on_<event>`
  method receives through `BioVizWidget._on_event`.
