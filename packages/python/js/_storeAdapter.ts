import type { StoreController } from "@react-bio-viz/core";

/**
 * The slice of anywidget's `AnyModel` this adapter uses. Declared structurally rather than
 * imported from `@anywidget/types` so the bundle has no build-time dependency on anywidget itself
 * — the model object is handed to `render()` at runtime.
 */
export interface AnyModel {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  save_changes(): void;
  on(event: string, callback: () => void): void;
  off(event: string, callback: () => void): void;
  /** Sends a custom message to the kernel (received by `widget.on_msg` in Python). */
  send(content: Record<string, unknown>): void;
}

/**
 * Wraps one synced trait of an anywidget model as a {@link StoreController} — the same seam
 * `useControllableState` uses for a consumer's Zustand store.
 *
 * This is the whole Jupyter integration: an anywidget model is structurally already a
 * `StoreController` (`get`/`set`+`save_changes`/`on("change:key")` ↔ `getValue`/`setValue`/
 * `subscribe`), so no component needs a "Jupyter mode" branch. A trait written from Python
 * re-renders the component; an interaction in the browser writes the trait back, which is what
 * makes `widget.observe("viewport", cb)` fire on the kernel side.
 *
 * @param model - The anywidget model passed to `render({ model, el })`.
 * @param key - The synced trait name to bind, e.g. `"viewport"` or `"selection"`.
 */
export function createAnywidgetStoreController<T>(model: AnyModel, key: string): StoreController<T> {
  // `useSyncExternalStore` re-renders whenever `getValue()` returns a new reference and will spin
  // if it is not stable between notifications, so the last non-null value is cached rather than
  // re-derived. It also guards the window before Python has seeded the trait: a `null` snapshot
  // would propagate straight into the component as its viewport/selection.
  let snapshot = model.get(key) as T;

  return {
    getValue: () => {
      const current = model.get(key) as T | null | undefined;
      if (current !== null && current !== undefined) snapshot = current;
      return snapshot;
    },
    setValue: (next) => {
      const value = typeof next === "function" ? (next as (prev: T) => T)(snapshot) : next;
      snapshot = value;
      model.set(key, value);
      model.save_changes();
    },
    subscribe: (listener) => {
      const handler = () => {
        const current = model.get(key) as T | null | undefined;
        if (current !== null && current !== undefined) snapshot = current;
        listener(snapshot);
      };
      model.on(`change:${key}`, handler);
      return () => model.off(`change:${key}`, handler);
    },
  };
}
