/**
 * @public
 * A minimal external-store seam that {@link useControllableState} can delegate to instead of
 * plain React state. Any store — Zustand, an anywidget model, a hand-rolled event emitter — can
 * satisfy this by implementing `getValue`/`setValue`/`subscribe`.
 */
export interface StoreController<T> {
  /** Read the current value synchronously. */
  getValue: () => T;
  /** Write a new value, or derive one from the previous value. */
  setValue: (next: T | ((prev: T) => T)) => void;
  /** Subscribe to changes; call the returned function to unsubscribe. */
  subscribe: (listener: (value: T) => void) => () => void;
}

/** @public */
export type ControllableStateChangeSource = "internal" | "external" | "programmatic";

/**
 * @public
 * Options accepted by {@link useControllableState}. Every stateful prop in this library is a
 * thin, domain-named wrapper around this shape — see the `bio-viz-conventions` project skill.
 */
export interface ControllableStateOptions<T> {
  /** Present (not `undefined`) to fully control the value from the consumer. */
  value?: T;
  /** Seeds uncontrolled/internal state. Ignored once `value` is provided. */
  defaultValue?: T;
  /** Called on every change, whether the change originated internally or externally. */
  onChange?: (next: T, meta: { source: ControllableStateChangeSource }) => void;
  /** Delegates state ownership to an external store instead of React state. */
  store?: StoreController<T>;
}

/**
 * @public
 * The part of a Zustand store's API that {@link createZustandStoreController} uses. Declared
 * structurally rather than imported from `zustand`, so this library's published types resolve
 * without `zustand` installed — any real Zustand store (vanilla or the `create()` hook, which
 * exposes the same methods) satisfies it.
 */
export interface ZustandLikeStore<TState> {
  getState: () => TState;
  setState(partial: TState | ((state: TState) => TState)): void;
  subscribe: (listener: (state: TState, previousState: TState) => void) => () => void;
}
