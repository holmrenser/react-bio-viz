import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { ControllableStateOptions } from "./types";

const noopSubscribe = () => () => {};
const EMPTY_SNAPSHOT = null;
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

/**
 * @public
 * The single state primitive every stateful prop in this library is built on. Supports three
 * modes, chosen by which options are passed, all producing the same `[value, setValue]` shape:
 *
 * - `value` present, no `store`: fully controlled — the consumer owns the value; `setValue` only
 *   calls `onChange`, it never updates anything locally.
 * - `value` absent, no `store`: uncontrolled — backed by local React state seeded from
 *   `defaultValue`; `onChange` still fires on every update so an observing-only parent works too.
 * - `store` present: delegates to the external {@link StoreController} via `useSyncExternalStore`
 *   instead of local state. Takes priority over `value`/`defaultValue` when present.
 *
 * See the `bio-viz-conventions` project skill for the full contract and the convention every
 * component follows for wrapping this under a domain-specific prop name (e.g. `viewport`/
 * `defaultViewport`/`onViewportChange`/`viewportStore`).
 */
export function useControllableState<T>(
  options: ControllableStateOptions<T>
): [T, (next: T | ((prev: T) => T)) => void] {
  const { value, defaultValue, onChange, store } = options;
  const isControlled = value !== undefined;

  const [internalValue, setInternalValue] = useState<T>(() =>
    isControlled ? (value as T) : (defaultValue as T)
  );

  const storeValue = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getValue : getEmptySnapshot
  );

  const currentValue = store ? (storeValue as T) : isControlled ? (value as T) : internalValue;

  const lastEmittedRef = useRef(currentValue);
  const isOwnUpdateRef = useRef(false);

  useEffect(() => {
    if (!store) return;
    if (currentValue !== lastEmittedRef.current) {
      const source = isOwnUpdateRef.current ? "internal" : "external";
      isOwnUpdateRef.current = false;
      lastEmittedRef.current = currentValue;
      onChange?.(currentValue, { source });
    }
  }, [store, currentValue, onChange]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      if (store) {
        isOwnUpdateRef.current = true;
        store.setValue(next);
        return;
      }
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(currentValue) : next;
      if (!isControlled) {
        setInternalValue(resolved);
      }
      lastEmittedRef.current = resolved;
      onChange?.(resolved, { source: "internal" });
    },
    [store, isControlled, currentValue, onChange]
  );

  return [currentValue, setValue];
}
