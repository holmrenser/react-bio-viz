import { createStore as createVanillaStore } from "zustand/vanilla";

import type { StoreController, ZustandLikeStore } from "./types";

/**
 * @public
 * Wraps a Zustand store (or a slice of one) as a {@link StoreController}, the seam
 * {@link useControllableState} delegates to for the `store` option. This is the reference
 * adapter — the same `StoreController` interface can back Redux, Jotai, an anywidget model
 * (see `@react-bio-viz/python`'s `createAnywidgetStoreController`), or any other external store.
 *
 * @param store - A Zustand vanilla store the consumer already owns.
 * @param select - Reads the relevant slice out of the store's state.
 * @param set - Writes a new value (or an updater function) back into the store.
 *
 * @example
 * ```ts
 * const controller = createZustandStoreController(
 *   appStore,
 *   (s) => s.msaViewport,
 *   (store, next) => store.setState((s) => ({
 *     msaViewport: typeof next === "function" ? next(s.msaViewport) : next,
 *   })),
 * );
 * <MultipleSequenceAlignment msa={data} store={controller} />
 * ```
 */
export function createZustandStoreController<TStore, T>(
  store: ZustandLikeStore<TStore>,
  select: (state: TStore) => T,
  set: (store: ZustandLikeStore<TStore>, value: T | ((prev: T) => T)) => void
): StoreController<T> {
  return {
    getValue: () => select(store.getState()),
    setValue: (next) => set(store, next),
    subscribe: (listener) => {
      let lastValue = select(store.getState());
      return store.subscribe((state) => {
        const nextValue = select(state);
        if (nextValue !== lastValue) {
          lastValue = nextValue;
          listener(nextValue);
        }
      });
    },
  };
}

/**
 * @public
 * Convenience for the common case: a dedicated Zustand vanilla store for a single controllable
 * value, with no need to hand-roll a `select`/`set` pair. Pass the result straight to
 * {@link createZustandStoreController}, or read/write it directly.
 *
 * @example
 * ```ts
 * const viewportStore = createControllableStore<Viewport>(initialViewport);
 * const controller = createZustandStoreController(viewportStore, (v) => v, (store, next) =>
 *   store.setState((prev) => (typeof next === "function" ? next(prev) : next))
 * );
 * ```
 */
export function createControllableStore<T>(initial: T): ZustandLikeStore<T> {
  const store = createVanillaStore<T>(() => initial);
  return {
    getState: store.getState,
    subscribe: store.subscribe,
    // Always replace: Zustand merges object updates by default, which would turn an array value
    // (e.g. a row order) into a plain object and splice stale keys into a replaced object.
    setState: (next) => store.setState(next, true),
  };
}
