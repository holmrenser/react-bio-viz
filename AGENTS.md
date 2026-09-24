# AGENTS.md

Instructions for AI coding agents (and human contributors) working in this repository.

## What this is

`react-bio-viz` is a monorepo of reusable, consistently-designed React components for biological
data visualization (multiple sequence alignments, phylogenetic trees, gene models, genome browser
tracks, BLAST hit distributions), plus a Python/Jupyter wrapper published to PyPI under the same
name. The overriding design goal is **API consistency**: every stateful component is built from
the same shared primitives so that learning one component's controlled/uncontrolled/external-store
conventions means you already know all of them.

## Layout

```
packages/
  core/         @react-bio-viz/core        shared state/viewport/color/scale/UI primitives
  components/   react-bio-viz               the visualization components themselves
  python/       react-bio-viz (PyPI)        anywidget-based Jupyter/Python bindings
apps/
  demo/                                     Vite playground app, not published
```

Package manager: **pnpm** (workspace defined in `pnpm-workspace.yaml`). Use `pnpm --filter <pkg>
<script>` to target one package, or the root scripts (`pnpm build`, `pnpm test`, `pnpm typecheck`,
`pnpm lint`) to run across all packages. `packages/components` and `apps/demo` consume `@react-bio-viz/core`
and `react-bio-viz` respectively as **built** workspace dependencies (via `dist/`), so run
`pnpm --filter @react-bio-viz/core build` (and `--filter react-bio-viz build`) before expecting
the demo app or a dependent package to pick up source changes — there is no live cross-package
source HMR in this setup.

## Module layout

Every component in `packages/components/src/components/` follows the same internal structure,
matching the reference project `wur-bioinformatics/acacia`:

```
ComponentName/
  index.tsx        public API: the root component, plus re-exported public types
  types.ts         all TypeScript types for the module
  constants.ts     module-level constants — no magic numbers inline in components
  components/      React sub-components (PascalCase.tsx)
  hooks/           custom hooks (useCamelCase.ts)
  utils/           pure functions, with co-located *.test.ts
  layouts/         (PhyloTree) or tracks/ (GenomeBrowser) — pluggable renderers
```

Pure logic belongs in `utils/` with a co-located test, not inline in a component. Anything shared
by more than one component moves up into `packages/core` instead of being imported sideways.

## The controllable-state convention (read before adding or touching any stateful prop)

Every component prop that represents interactive UI state (a viewport/pan/zoom position, a
selection, a reroot target) is built on `useControllableState` from `@react-bio-viz/core`, exposed
under a domain-specific name following this exact shape:

```ts
someState?: T;                     // controlled
defaultSomeState?: T;              // uncontrolled seed
onSomeStateChange?: (next: T) => void;
someStateStore?: StoreController<T>;  // external-store seam (e.g. a consumer's Zustand store)
```

All four are named for the state, the store included — `viewportStore`, `selectionStore`, never a
bare `store`, even on a component that has only one. That uniformity is what lets the Python
bridge bind a trait to its prop by name alone.

Do not invent a different shape (no bare `onChange` without `value`/`defaultValue`, no prop-only
state with no callback, no component-private store that can't be observed or seeded from outside).
See `.claude/skills/bio-viz-conventions/SKILL.md` for the full contract, code template, and a
worked example — load that skill before implementing a new stateful component or prop.

## UI chrome vs. visualization rendering

- **Chrome** (buttons, toolbars, tooltips, sliders, popovers, selects — anything that isn't itself
  the biological data) is built from shadcn/ui components living in `packages/core/src/components/ui/`. Check
  there before adding a new one; add new shadcn components via the `shadcn` CLI into that directory
  rather than hand-rolling equivalents.
- **Visualization surfaces** (SVG sequence/gene/tree rendering, MSA canvases) are hand-rolled — do
  not reach for shadcn/ui there.
- shadcn/ui components are Tailwind-styled; Tailwind is compiled at `packages/core`'s build time
  into a single shipped stylesheet (`@react-bio-viz/core/style.css`) so consuming apps never need
  Tailwind configured themselves. Don't add a Tailwind config requirement to any other package.
- **Consumers must import that stylesheet once** (`import "react-bio-viz/style.css"`) — Vite's
  library build emits it beside the JS rather than importing it from there. Without it the chrome
  is unstyled and the theme tokens (`--foreground`, `--rbv-accent`, …) are undefined. `apps/demo`
  does this in `src/main.tsx`.
- **The stylesheet must never restyle the host app**: no Tailwind preflight, no global element
  rules, tokens at zero specificity so the host's win. Put `ROOT_CLASS` (from core) on every
  component root and portalled overlay — the element reset is scoped to it. See the skill, 5b.
- **Colors**: prefer `currentColor` and theme tokens (`text-foreground`, `text-muted-foreground`,
  `bg-background`, `var(--background)`) over literal colors, so components follow the host's
  light/dark theme. The one reserved saturated color is `--rbv-accent`, for interactive
  affordances (hover outlines, selection strokes, the MSA cursor). Canvas can't read CSS custom
  properties, so canvas rendering takes an explicit `darkMode` value — default it from
  `useDarkMode()` in `@react-bio-viz/core`, which tracks the `dark` class on `<html>`.

## Commands

- `pnpm install` — install all workspace dependencies.
- `pnpm build` — build every package in dependency order (`core` → `components` → the `python`
  widget bundle).
- `pnpm --filter apps/demo dev` — run the Vite playground (rebuild dependent packages first).
- `pnpm test` — run Vitest across packages.
- `pnpm typecheck` — `tsc` (noEmit) across packages.
- `pnpm lint` — ESLint (one flat config at the repo root, `eslint.config.js`) across packages.
- `pnpm run docs` — regenerate the api-extractor/api-documenter reference docs into `/docs` (both packages). Not `pnpm docs`: that is a pnpm built-in that opens a package homepage and never runs the script.

Python package (`packages/python`, PyPI name `react-bio-viz`):

- `pnpm --filter @react-bio-viz/python-widgets build` — bundle the widget JS into
  `src/react_bio_viz/static/` (also run by `pnpm build`).
- `uv pip install -e ".[dev]"` then `pytest` — from `packages/python`.

## Where things live

- State/viewport/color/scale primitives and shadcn/ui chrome: `packages/core/src/`.
- Components (`MultipleSequenceAlignment`, `PhyloTree`, `DistanceMatrix`, `GeneModel`,
  `GenomeBrowser`, `BlastHitDistribution`): `packages/components/src/components/`, barrel-exported
  from `packages/components/src/main.ts`.
- Publishing: `react-bio-viz` bundles `@react-bio-viz/core` (JS and, via `rollupTypes`, its
  declarations) and every other library it uses, so its only runtime requirements are its React
  peer dependencies. Keep bundled libraries in `devDependencies`.
- Python/anywidget bindings: `packages/python/` — one `AnyWidget` subclass per component in
  `src/react_bio_viz/`, the JS bridge in `js/` (`widget.tsx` dispatches on a `_component` trait so
  all six widgets share one bundle; `_storeAdapter.ts` wraps a synced trait as a
  `StoreController`). Adding a prop means: a snake_case trait on the Python class, its name in
  that component's `props` list in `js/widget.tsx`, and a test. Interactive state goes in `stores`
  instead (bound to the camelCased `<trait>Store` prop), and must be seeded with a non-`None`
  default — a `None` store snapshot reaches the component as a null viewport/selection and crashes
  it. Event callbacks (`onRenameRow`, `onNodeClick`, …) go in `events`, sending a custom message
  that a Python `on_<event>` method receives through `BioVizWidget._on_event`.

For the full architectural rationale (why `useControllableState` looks the way it does, the
`StoreController` external-store adapter design, the viewport pan/zoom primitive, the color
system) see `.claude/skills/bio-viz-conventions/SKILL.md`.
