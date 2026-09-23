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
with a viewport) and `useTreeSelection` (reroot/collapse — PhyloTree). The naming rule is what lets
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
- **Drag-to-reorder** — dragging a node among its siblings. Track the gesture in a `useRef`
  (`{parentId, order, draggedId, startIndex, startClientY}`), convert screen-pixel delta to
  data-space delta the same way `useDragPan` does, and maintain a *local* `previewOrder` state for
  live visual feedback during the drag — only commit to the controllable `selection`/`onChange` once,
  on pointer-up, never on every pointermove (that would spam the callback and thrash external
  stores). See `PhyloTree/utils/reorder.ts` (`computeReordered`, `applyOrder`) and the `handleReorder*`
  handlers in `PhyloTree/index.tsx`. The pure reorder/prune functions return a *new* node whenever
  they change anything, and the *same reference* when there's nothing to do — cheap to check, and
  lets `useMemo` skip work.
- **Marker occlusion**: a clickable marker positioned exactly at a node's (x,y) can be visually and
  functionally covered by a *child's* branch line, since children paint after their parent in SVG
  document order and every child branch starts at that exact point. Render such markers in a
  separate pass, after all branches — see `PhyloTree/components/CollapseMarker.tsx`'s doc comment, and always
  mark them `data-pan-ignore` (section 3) since they sit inside a pannable surface.

## 8. Checklist for adding a new component

0. Lay the module out per section 0 (`index.tsx` / `types.ts` / `constants.ts` / `components/` /
   `hooks/` / `utils/`); no magic numbers inline, no pure logic inside a component file.
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
