import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { createControllableStore } from "./createExternalStoreAdapter";
import type { ControllableStateOptions, SetValue } from "./types";

/**
 * @public
 * The state primitive behind every stateful prop in this library. The options passed pick the mode,
 * and every mode returns the same `[value, setValue]`:
 *
 * - `store`: the value lives in that {@link StoreController}. Takes priority over `value`.
 * - `value`: controlled — `setValue` only reports the next value through `onChange`.
 * - neither: uncontrolled — the value lives in a private Zustand store seeded from `defaultValue`.
 *
 * `onChange` fires on every change in every mode. Components expose this under domain-named props
 * (`viewport`/`defaultViewport`/`onViewportChange`/`viewportStore`).
 */
export function useControllableState<T>(
  options: ControllableStateOptions<T>,
): [T, SetValue<T>] {
  const { value, defaultValue, onChange, store } = options;
  const [ownStore] = useState(() =>
    createControllableStore((value !== undefined ? value : defaultValue) as T),
  );
  const source = store ?? ownStore;
  const isControlled = !store && value !== undefined;

  // The store's snapshot is as valid on the server as in the browser.
  const stored = useSyncExternalStore(
    source.subscribe,
    source.getValue,
    source.getValue,
  );
  const current = isControlled ? (value as T) : stored;

  const reportedRef = useRef(current);
  const isOwnUpdateRef = useRef(false);
  useEffect(() => {
    if (isControlled || current === reportedRef.current) return;
    reportedRef.current = current;
    const isExternal = store !== undefined && !isOwnUpdateRef.current;
    isOwnUpdateRef.current = false;
    onChange?.(current, { source: isExternal ? "external" : "internal" });
  }, [isControlled, current, store, onChange]);

  const setValue = useCallback<SetValue<T>>(
    (next) => {
      if (!isControlled) {
        isOwnUpdateRef.current = true;
        source.setValue(next);
        return;
      }
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      onChange?.(resolved, { source: "internal" });
    },
    [isControlled, source, current, onChange],
  );

  return [current, setValue];
}
