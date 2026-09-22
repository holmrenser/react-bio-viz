---
name: bio-viz-conventions
description: Architectural conventions for react-bio-viz components — the controllable-state pattern, the viewport pan/zoom primitive, shadcn/ui usage rules, and the checklist for adding a new component. Load this before creating or modifying any component in packages/components or any primitive in packages/core.
---

# react-bio-viz component conventions

This is the working reference for building components in this repo. If you're about to add a
prop that holds interactive state, add a new component, or touch `packages/core`, read this first.

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
`useControllableState` with generic `value`/`onChange` props directly on a component — wrap it:

```ts
function useViewportState(props: {
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (v: Viewport) => void;
  store?: StoreController<Viewport>;
}) {
  return useControllableState({
    value: props.viewport,
    defaultValue: props.defaultViewport ?? DEFAULT_VIEWPORT,
    onChange: (v) => props.onViewportChange?.(v),
    store: props.store,
  });
}
```

Existing domain wrappers to reuse or model new ones on: `useViewport` (pan/zoom — MSA, GeneModel,
GenomeBrowser), `useTreeSelection` (reroot/collapse — PhyloTree), the selection state in
BlastHitDistribution.

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

## 4. shadcn/ui usage rule

- Chrome (buttons, toolbars, tooltips, sliders, popovers, selects) → shadcn/ui components in
  `packages/core/src/components/ui/`. Check what's already there before adding a new one via the `shadcn` CLI.
- Visualization surfaces (SVG/Canvas rendering of sequences, trees, genes, tracks) → hand-rolled,
  never shadcn.
- Tailwind is compiled at `packages/core`'s build time into one shipped stylesheet — don't require
  Tailwind configuration in any other package.

## 5. Color system

`packages/core/src/color/`: `Palette<T extends string>` for named category→color maps (e.g. amino
acid palettes), `createCategoricalColorScale(seed?)` for deterministic seeded categorical colors.
Use these instead of calling `randomcolor`/`color` directly in a component — every component's
"assign a color to this category" logic should go through the same function.

## 6. Checklist for adding a new component

1. Props follow the controllable-state shape (section 1) for every piece of interactive state;
   plain data props (e.g. `msa`, `tree`, `gene`, `hits`) are ordinary required/optional props.
2. Pan/zoom needs → `useViewport` from core, not custom logic.
3. Any per-category coloring → `createCategoricalColorScale` or a `Palette<T>`.
4. Tooltips/popovers → `packages/core/src/overlay/Popover.tsx`, not a new implementation.
5. Toolbar/controls → shadcn/ui components from `packages/core/src/components/ui/`.
6. Add a Vitest smoke test (`packages/components/src/components/<Name>/<Name>.test.tsx`) that
   renders with representative fixture data and, if the component has controllable state, a test
   covering all three modes (controlled / uncontrolled / store-backed) — model on
   `useControllableState.test.ts` in `packages/core`.
7. Barrel-export the component and its public types from `packages/components/src/main.ts`, with
   `@public` TSDoc tags so api-extractor picks it up.
