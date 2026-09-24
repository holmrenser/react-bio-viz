---
name: bio-viz-conventions
description: Architectural conventions for react-bio-viz components — the controllable-state pattern, the viewport pan/zoom primitive, shadcn/ui usage rules, and the checklist for adding a new component. Load this before creating or modifying any component in packages/components or any primitive in packages/core.
---

# react-bio-viz component conventions

This is the working reference for building components in this repo. If you're about to add a
prop that holds interactive state, add a new component, or touch `packages/core`, read this first.

## 0. Module layout

Every component module mirrors the reference project `wur-bioinformatics/acacia`:

```
ComponentName/
  index.tsx        public API: the root component + re-exported public types
  types.ts         all module types
  constants.ts     module constants — never leave magic numbers inline
  components/      sub-components (PascalCase.tsx)
  hooks/           custom hooks (useCamelCase.ts)
  utils/           pure functions + co-located *.test.ts
  layouts/ | tracks/   pluggable renderers, where a module has them
```

Pure logic goes in `utils/` with a co-located test — not inline in a component. Anything two
components would share moves up into `packages/core`, never imported sideways between modules.

## 1. `useControllableState` — the only sanctioned state pattern

Location: `packages/core/src/state/useControllableState.ts`.

```ts
export interface StoreController<T> {
  getValue: () => T;
  setValue: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: (value: T) => void) => () => void;
}

export interface ControllableStateOptions<T> {
  value?: T;
  defaultValue?: T;
  onChange?: (next: T, meta: { source: "internal" | "external" | "programmatic" }) => void;
  store?: StoreController<T>;
}

export function useControllableState<T>(
  options: ControllableStateOptions<T>
): [T, (next: T | ((prev: T) => T)) => void];
```

Rules:
- `value` present → fully controlled. Internal state is not used; every update calls `onChange`
  and the caller must feed a new `value` back for it to visibly change.
- `value` absent, `defaultValue` present → uncontrolled, but `onChange` still fires on every
  update, so an observing-only parent works without taking over control.
- `store` present → delegates to that `StoreController<T>` via `useSyncExternalStore` instead of
  `useState`. This is invisible to the caller — same `value`/`defaultValue`/`onChange` contract.

**Every component wraps this once under a domain-specific prop name.** Do not call
`useControllableState` with generic `value`/`onChange` props directly on a component — wrap it.

For a piece of state named `x`, the four props are **always** `x` / `default<X>` / `on<X>Change` /
`<x>Store` — including the store, which is never bare `store` even on a component that has only
one. A component that later grows a second controllable prop would otherwise have to rename its
first one, and a reader of `store` can't tell what it stores:

```ts
function useViewportState(props: {
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (v: Viewport) => void;
  viewportStore?: StoreController<Viewport>;
}) {
  return useControllableState({
    // Only `useControllableState` itself uses the generic names; everything above it is domain-named.
    value: props.viewport,
    defaultValue: props.defaultViewport ?? DEFAULT_VIEWPORT,
    onChange: (v) => props.onViewportChange?.(v),
    store: props.viewportStore,
  });
}
```

Existing domain wrappers to reuse or model new ones on: `useViewport` (pan/zoom — every component
with a viewport), `useTreeSelection` (reroot/collapse/order — PhyloTree), and `useMSASelection`/
`useRowOrder`/`usePanelSizes` (MultipleSequenceAlignment's `hooks/useMSAState.ts`).

**Data edits are events, not state.** A component never mutates its data prop (`msa`, `tree`): a
rename or removal is reported through a callback (`onRenameRow`, `onRemoveRows`, `onRemoveColumns`)
and the caller applies it and passes the new data back. That keeps undo/redo and edit logs (acacia
keeps an edit log against the original alignment) in the caller's hands. Clicks that should open a
caller's UI (`onNodeClick`, `onBranchClick`) are events too — report enough to act on
(`TreeNodeInfo`: leaves, descendant ids, `rerootAbove`) that the caller never has to re-derive
anything from the component's internals. The naming rule is what lets
the Python bridge bind a trait to its prop by name alone, with no per-component mapping table —
see `packages/python/js/widget.tsx`.

## 2. External-store seam

`StoreController<T>` is the seam every "plug into your own state" integration goes through:
Zustand (`createZustandStoreController`, `packages/core/src/state/createExternalStoreAdapter.ts`),
and the anywidget Python bridge (`createAnywidgetStoreController` in `packages/python/js/`).
Adding a new integration (Redux, Jotai, etc.) means writing one more `StoreController<T>` adapter —
never means adding a branch inside a component or inside `useControllableState` itself.

## 3. Viewport primitive

`packages/core/src/viewport/`: `Viewport` is a plain, serializable object (`x0,x1,y0,y1,
xMin,xMax,yMin,yMax`) — never a class with mutation methods, so it survives living in a store or
being diffed by React. Pure functions (`panBy`, `zoomBy`, `zoomAt`, `clampToExtent`, `fitToExtent`)
operate on it. `useViewport` composes `useControllableState<Viewport>` with `useDragPan` and
`useWheelZoom`. Reach for this any time a component needs "large virtual coordinate space + a
visible window into it" — do not hand-roll pan/zoom state again (this has been done three times in
this codebase's history already; every rewrite should have used this instead).

If the pannable surface has nested elements with their own click behavior (a feature marker with
a popover, e.g. GeneModel's `Exon`), mark that element with `data-pan-ignore` so `useDragPan`
doesn't capture the pointer and swallow the click — see `GeneModel/components/Exon.tsx` for the pattern.

`useWheelZoom` returns a callback `ref` (spread its result onto the surface): it attaches a native
wheel listener with `passive: false`, because React's `onWheel` is passive and `preventDefault()`
there is ignored — the page scrolls underneath the zoom. Pass `onPan` for surfaces that are mostly
scrolled through (MSA, tree, distance matrix): a plain scroll then pans and Ctrl/⌘-scroll (which is
also what a trackpad pinch reports) zooms. `zoomAt` takes an optional `factorY` for single-axis zoom.

**Pointer capture** retargets the `click`/`dblclick` that follow a press to the capturing element,
so capture only once a gesture has become a drag (past a few pixels), never on every press — or a
double-click inside the surface (rename a label) silently stops working. See `labels/RowLabels.tsx`.

## 4. shadcn/ui usage rule

- Chrome (buttons, toolbars, tooltips, sliders, popovers, selects) → shadcn/ui components in
  `packages/core/src/components/ui/`. Check what's already there before adding a new one via the `shadcn` CLI.
- Visualization surfaces (SVG/Canvas rendering of sequences, trees, genes, tracks) → hand-rolled,
  never shadcn.
- Tailwind is compiled at `packages/core`'s build time into one shipped stylesheet — don't require
  Tailwind configuration in any other package.
- jsdom doesn't implement `Element.prototype.scrollIntoView`, which Radix's listbox-style
  primitives (`Select`, `Combobox`) call when opening — any Vitest test that opens one will throw
  unless it's stubbed. Already stubbed once, globally, in
  `packages/components/vitest.setup.ts` — no need to re-stub it per test file.

## 5. Color system

`packages/core/src/color/` holds three distinct kinds of color, one entry point each:

- **Residue schemes** (`schemes.ts`) — `residueColor(char, style, darkMode)` over the standard
  bioinformatics palettes (`"DNA"`, `"DNA ClustalX"`, `"AA ClustalX"`, `"AA Zappo"`, `"AA Taylor"`),
  each with a light and a dark variant. `detectSequenceType(sequences)` + `DEFAULT_COLOR_STYLE`
  pick a sensible default from the data's own alphabet, so callers don't have to. Never hand-roll
  a residue palette; add a scheme here instead.
- **Categorical** — `createCategoricalColorScale(seed?)` for deterministic per-category colors
  (exon ids, feature ids, taxon names). Use it instead of calling `randomcolor`/`color` directly.
- **Sequential** — `createSequentialColorScale({ domain, range? })` for a continuous numeric
  metric. If the metric's "better" direction isn't already increasing (e-value: lower is stronger),
  normalize it to a "higher is better" score before passing it in, rather than teaching the scale
  about orientation — see `BlastHitDistribution/utils/metrics.ts`'s `metricScore`.
  `qualityGradient(score, darkMode)` is the shared blue→red ramp for any 0–1 quality score.

## 5b. Theme, dark mode, and the accent

The shipped stylesheet defines the shadcn tokens plus `--rbv-accent`. Consumers import it once
(`import "react-bio-viz/style.css"`); without it, tokens are undefined and chrome is unstyled.

That stylesheet is loaded into *someone else's* app, so it must never restyle the host:

- No Tailwind preflight and no `html`/`body`/`*` rules — `core/src/styles.css` imports only
  Tailwind's theme and utilities layers. The small element reset the chrome needs is scoped to
  `.rbv` (`ROOT_CLASS` from core). **Every component root, and every portalled overlay
  (Popover/Tooltip/Select content), carries `ROOT_CLASS`.**
- Default tokens sit in `@layer base` under `:where(:root)`/`:where(.dark)` — zero specificity — and
  the build rewrites Tailwind's own `:root,:host` theme variables to `:where(...)` too
  (`core/vite.config.ts`). A host that defines `--background` or `--font-sans` always wins, so the
  components adopt the host's theme rather than overriding it (acacia's font was replaced before).

- **SVG** → use `currentColor` and theme tokens (`text-foreground`, `text-muted-foreground`,
  `var(--background)`). These follow the host's theme for free. Never literal `"black"`/`"white"`.
- **Interactive affordances** (hover outlines, selection strokes, the MSA cursor caret) → the
  reserved accent, `ACCENT_COLOR` (`var(--rbv-accent)`) from core. The shadcn palette is
  monochrome, so a hover drawn in `--ring` would be invisible against the data; this is the one
  saturated color the library reserves.
- **Canvas** → can't read CSS custom properties, so it needs a concrete decision: take a
  `darkMode` boolean and default it from `useDarkMode()` (core), which tracks the `dark` class on
  `<html>` via a `MutationObserver` and re-renders on change.

## 5c. Axis ticks

`packages/core/src/scale/ticks.ts` is the one tick implementation:
`computeAxisTicks({domain, range, minSpacing})` for continuous axes (genomic coordinates, query
positions), `computeColumnTicks({columnCount, width, offsetX, pixelsPerColumn})` for discrete
columns (the MSA ruler), `pickNiceLength(target)` for a legend sized to a round number (the tree
scale bar). All share one 1/2/5×10ⁿ step ladder, so every ruler in the library labels round
numbers. Derive `minSpacing` from how wide the labels will actually be — genomic coordinates run
to ten characters and collide at the default spacing (see `GeneModel/components/Scale.tsx`).

## 6. Row-stacking (interval-packing)

`packages/core/src/layout/stackIntervals.ts`: `stackIntervals(items: IntervalLike[])` greedily
assigns each `{id, start, end}`-shaped item a row index so that no two overlapping items share a
row (sorted by `start` first, so assignment is deterministic regardless of input order).
`countIntervalRows` returns how many rows that took. Use this any time a track/lane-style renderer
needs to avoid overlapping intervals — GenomeBrowser's feature track and BlastHitDistribution's hit
rows both reuse this one implementation instead of hand-rolling their own.

## 7. Minimaps, highlighting, hover feedback, and drag-to-reorder

Patterns established in `MultipleSequenceAlignment` and `PhyloTree`, modeled on the reference
project `wur-bioinformatics/acacia` (its features, not its zero-prop/global-store architecture):

- **Interactive minimap** — not just a static overview box. Click outside the viewport box jumps
  the view there; dragging inside it pans (`panBy`); dragging near an edge resizes it (zooms) via
  `setViewport`/`clampToExtent`. See `MultipleSequenceAlignment/components/Minimap.tsx`. Track hover zone in
  local `useState` for cursor feedback (`grab`/`ew-resize`); the drag gesture itself lives in a
  `useRef`, not state, since it doesn't need to trigger renders on every pixel.
- **Highlighting** — a pure `computeHighlightMask`/similar function (case-insensitive substring or
  regex, invalid regex matches nothing rather than throwing) that a canvas/SVG renderer consumes to
  override normal coloring for matches and dim everything else. See
  `MultipleSequenceAlignment/utils/highlight.ts` and `PhyloTree/utils/search.ts` (`matchesQuery`) — same shape,
  each adapted to its own rendering surface (canvas fill vs. SVG `fontWeight`/`opacity`).
- **Hover tooltip / position badge** — ephemeral, non-controllable local `useState` (not part of
  the public controllable-state API — nothing meaningful is lost if it resets on remount). See
  `MultipleSequenceAlignment/components/CursorTooltip.tsx` and `CursorPositionBadge.tsx`.
- **Drag-to-reorder** — a pure *planner* maps "this node was dragged to that row" to the next
  controllable state, and the component only previews and commits it. In PhyloTree,
  `planTipMove` (utils/treeOps.ts) turns the row under the pointer into a `selection.order` of
  rotations only — the topology never changes; dragging up lands the clade's first tip on the row,
  dragging down its last, a row inside the clade is a no-op — and `planDragReroot` handles a drop
  past either end of the tree (reroot there, clade at that end). Map the pointer to an *absolute*
  row (from the surface's bounding box, the viewport offset and the margin), not a delta from where
  the node was grabbed. Keep the gesture in a `useRef`, the preview in local state (mirrored in a
  ref so pointer-up can commit it without a side-effecting state updater), and commit to the
  controllable state once, on pointer-up — never on every pointermove, which would spam the
  callback and thrash external stores. `preventDefault()` on the press, or the drag selects text.
- **Tree transforms rebuild parent links.** Every pure transform (`applyOrder`, `pruneCollapsed`,
  `rerootOnBranch`) returns nodes whose `parent` is the *new* parent: layout positions the new
  objects, and a branch is drawn from `node.parent`, so a stale pointer draws it from wherever the
  old, un-laid-out object sits (every reordered branch started at x = 0 before this was fixed).
  They return the *same reference* when there's nothing to do, so `useMemo` can skip work.
- **Stable ids.** Node ids come from the tree as passed in (`data.ID`, else a positional path) and
  survive reroots — `rerootOnBranch` re-hangs the existing nodes and only adds `REROOT_ID`. That is
  what keeps `selection.collapsed`, `selection.order`, `nodeStyles` and a caller's own maps valid.
  `rerootedAt` names a branch of the tree *as passed in*; for a "reroot here" on a tree that may
  already be rerooted, use `rerootAbove(tree, selection, id)` (also on `TreeNodeInfo`), which maps
  the branch drawn above a node back to the original tree.
- **Marker occlusion**: a clickable marker positioned exactly at a node's (x,y) can be visually and
  functionally covered by a *child's* branch line, since children paint after their parent in SVG
  document order and every child branch starts at that exact point. Render such markers in a
  separate pass, after all branches — see `PhyloTree/components/NodeMarker.tsx`'s doc comment, and always
  mark them `data-pan-ignore` (section 3) since they sit inside a pannable surface.
- **Shared row labels** — `RowLabels` (core) is the one label column: virtualised, aligned with a
  zoomed row axis (`rowHeight`, `offsetY`), with hover, click-select, rename, remove and
  drag-to-reorder each enabled by passing its callback. MSA and DistanceMatrix both use it, and
  both take the same `rowOrder: string[]` shape so one store can order an alignment, its tree and
  its distance matrix together (`resolveRowOrder`/`moveItem` in core).

## 7b. Large data

acacia's datasets go to ~1000 × 1200 and beyond; everything must cost O(what's on screen):

- **Canvas: draw the visible window, never a full-size bitmap.** Browsers cap a canvas at roughly
  268 Mpx (Chromium) and silently draw nothing past it — a 986 × 1182 alignment at 16px cells is
  298 Mpx, and rendered blank. The MSA resolves every cell's colour once into a `Uint16Array`
  palette-index matrix (`utils/colorIndex.ts`), then `drawAlignment` paints per cell when cells
  are ≥ 2px (letters re-rasterised at the current zoom, so they stay crisp) and per *pixel* via
  `ImageData` below that. The minimap is the same renderer with the whole alignment as its window.
- **SVG: memoise the body apart from the viewport.** Panning changes only the `<svg viewBox>`; the
  element tree must not re-render (PhyloTree's `body` `useMemo` — a 986-leaf tree took ~100 ms per
  pan step before). Handlers read changing values through a `latest` ref so they stay stable.
- **DOM lists: virtualise.** `RowLabels` renders only visible rows; the distance matrix is a canvas
  plus a header that renders only visible columns (acacia's DOM grid was n² elements).

## 8. Checklist for adding a new component

0. Lay the module out per section 0 (`index.tsx` / `types.ts` / `constants.ts` / `components/` /
   `hooks/` / `utils/`); no magic numbers inline, no pure logic inside a component file. Put
   `ROOT_CLASS` on the root element (section 5b).
1. Props follow the controllable-state shape (section 1) for every piece of interactive state;
   plain data props (e.g. `msa`, `tree`, `gene`, `hits`) are ordinary required/optional props.
2. Pan/zoom needs → `useViewport` from core, not custom logic.
3. Residue coloring → `residueColor`; per-category coloring → `createCategoricalColorScale`;
   continuous numeric metric → `createSequentialColorScale` (section 5). Overlapping intervals
   that need to avoid visually colliding (tracks, lanes) → `stackIntervals` (section 6). Any
   axis ruler → `computeAxisTicks`/`computeColumnTicks` (section 5c).
4. Tooltips/popovers → `packages/core/src/overlay/Popover.tsx`, not a new implementation.
5. Toolbar/controls → shadcn/ui components from `packages/core/src/components/ui/`; colors per
   section 5b (`currentColor`/theme tokens for SVG, `ACCENT_COLOR` for affordances, an explicit
   `darkMode` for canvas).
6. Add a Vitest smoke test (`packages/components/src/components/<Name>/<Name>.test.tsx`) that
   renders with representative fixture data and, if the component has controllable state, a test
   covering all three modes (controlled / uncontrolled / store-backed) — model on
   `useControllableState.test.ts` in `packages/core`.
7. Barrel-export the component and its public types from `packages/components/src/main.ts`, with
   `@public` TSDoc tags so api-extractor picks it up.
