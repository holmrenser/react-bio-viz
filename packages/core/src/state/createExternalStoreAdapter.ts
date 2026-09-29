import { createStore as createVanillaStore } from "zustand/vanilla";

import type { StoreController, ZustandLikeStore } from "./types";

/**
 * @public
 * Binds one slice of an existing Zustand store as a {@link StoreController}, to pass as a
 * component's `*Store` prop. For a store holding just that one value, use
 * {@link createControllableStore} instead.
 *
 * @param store - A Zustand store the consumer already owns.
 * @param select - Reads the slice out of the store's state.
 * @param set - Writes a new value (or an updater function) back into the store.
 *
 * @example
 * ```ts
 * const viewportStore = createZustandStoreController(
 *   appStore,
 *   (s) => s.msaViewport,
 *   (store, next) => store.setState((s) => ({
 *     msaViewport: typeof next === "function" ? next(s.msaViewport) : next,
 *   })),
 * );
 * <MultipleSequenceAlignment msa={data} viewportStore={viewportStore} />
 * ```
 */
export function createZustandStoreController<TStore, T>(
  store: ZustandLikeStore<TStore>,
  select: (state: TStore) => T,
  set: (store: ZustandLikeStore<TStore>, value: T | ((prev: T) => T)) => void,
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
 * A standalone store for one value, backed by Zustand: pass it as any `*Store` prop, share it between
 * components, and read or write it from anywhere. Components use the same kind of store internally
 * when their state is uncontrolled.
 *
 * @example
 * ```tsx
 * const rowOrderStore = createControllableStore<string[]>([]);
 * <MultipleSequenceAlignment msa={msa} rowOrderStore={rowOrderStore} />
 * <DistanceMatrix labels={ids} matrix={distances} rowOrderStore={rowOrderStore} />
 * rowOrderStore.setValue(treeLeafOrder);
 * ```
 */
export function createControllableStore<T>(initial: T): StoreController<T> {
  const store = createVanillaStore<T>(() => initial);
  return {
    getValue: store.getState,
    // Replace rather than merge: Zustand merges object updates by default, which would turn an
    // array (a row order) into a plain object and keep stale keys of a replaced object.
    setValue: (next) => store.setState(next, true),
    subscribe: (listener) => store.subscribe((value) => listener(value)),
  };
}
