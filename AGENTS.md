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

## The controllable-state convention (read before adding or touching any stateful prop)

Every component prop that represents interactive UI state (a viewport/pan/zoom position, a
selection, a reroot target) is built on `useControllableState` from `@react-bio-viz/core`, exposed
under a domain-specific name following this exact shape:

```ts
someState?: T;                 // controlled
defaultSomeState?: T;          // uncontrolled seed
onSomeStateChange?: (next: T) => void;
store?: StoreController<T>;    // external-store seam (e.g. a consumer's Zustand store)
```

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

## Commands

- `pnpm install` — install all workspace dependencies.
- `pnpm build` — build `packages/core` and `packages/components` (dependency order handled by pnpm).
- `pnpm --filter apps/demo dev` — run the Vite playground (rebuild dependent packages first).
- `pnpm test` — run Vitest across packages.
- `pnpm typecheck` — `tsc` (noEmit) across packages.
- `pnpm --filter react-bio-viz docs` — regenerate the api-extractor/api-documenter reference docs into `/docs`.

## Where things live

- State/viewport/color/scale primitives and shadcn/ui chrome: `packages/core/src/`.
- Components (`MultipleSequenceAlignment`, `PhyloTree`, `GeneModel`, `GenomeBrowser`,
  `BlastHitDistribution`): `packages/components/src/components/`, barrel-exported from
  `packages/components/src/main.ts`.
- Python/anywidget bindings: `packages/python/`.

For the full architectural rationale (why `useControllableState` looks the way it does, the
`StoreController` external-store adapter design, the viewport pan/zoom primitive, the color
system) see `.claude/skills/bio-viz-conventions/SKILL.md`.
