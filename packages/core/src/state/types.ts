/**
 * @public
 * Sets a value directly, or derives it from the previous one — the setter `useControllableState`
 * returns and {@link StoreController.setValue} accepts.
 */
export type SetValue<T> = (next: T | ((prev: T) => T)) => void;

/**
 * @public
 * The seam through which a component's state lives in a store it doesn't own: any store — Zustand,
 * an anywidget model, a hand-rolled event emitter — can back a `*Store` prop by implementing these
 * three functions. {@link createControllableStore} makes a standalone one.
 */
export interface StoreController<T> {
  /** Read the current value synchronously. */
  getValue: () => T;
  /** Write a new value, or derive one from the previous value. */
  setValue: SetValue<T>;
  /** Subscribe to changes; call the returned function to unsubscribe. */
  subscribe: (listener: (value: T) => void) => () => void;
}

/**
 * @public
 * Where a reported change came from: the component itself, or another writer of its store.
 */
export type ControllableStateChangeSource = "internal" | "external";

/**
 * @public
 * Options for `useControllableState`. Every stateful prop in this library is a domain-named group of
 * these four — see
 * {@link https://holmrenser.github.io/react-bio-viz/concepts/controllable-state/ | Controllable state}.
 */
export interface ControllableStateOptions<T> {
  /** Controls the value: the component only reports changes, through `onChange`. */
  value?: T;
  /** Seeds the value when neither `value` nor `store` is given. */
  defaultValue?: T;
  /** Called with every change, in every mode. */
  onChange?: (next: T, meta: { source: ControllableStateChangeSource }) => void;
  /** Keeps the value in an external store. Takes priority over `value`. */
  store?: StoreController<T>;
}

/**
 * @public
 * The part of a Zustand store's API that {@link createZustandStoreController} uses. Structural, so
 * the published types resolve without `zustand` installed; any real Zustand store satisfies it.
 */
export interface ZustandLikeStore<TState> {
  getState: () => TState;
  setState(partial: TState | ((state: TState) => TState)): void;
  subscribe: (
    listener: (state: TState, previousState: TState) => void,
  ) => () => void;
}
