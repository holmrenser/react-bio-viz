import type { StoreController } from "@react-bio-viz/core";

/** The part of anywidget's `AnyModel` the bridge uses — structural, so it needs no anywidget types. */
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
 * One synced trait as a {@link StoreController} — the seam a JavaScript app fills with a Zustand
 * store, so no component has Jupyter-specific code. A trait written from Python re-renders the
 * component; an interaction writes the trait back, firing `widget.observe` in the kernel.
 *
 * @param model - The anywidget model passed to `render({ model, el })`.
 * @param key - The synced trait name to bind, e.g. `"viewport"` or `"selection"`.
 */
export function createAnywidgetStoreController<T>(model: AnyModel, key: string): StoreController<T> {
  // The last non-null value, cached: `useSyncExternalStore` needs a stable snapshot between
  // notifications, and a `null` one (before Python seeds the trait) would reach the component.
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
