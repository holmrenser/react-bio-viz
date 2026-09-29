import { act, renderHook } from "@testing-library/react";
import { createStore } from "zustand/vanilla";
import { describe, expect, it, vi } from "vitest";

import { useControllableState } from "./useControllableState";
import { createControllableStore, createZustandStoreController } from "./createExternalStoreAdapter";

describe("useControllableState", () => {
  it("uncontrolled mode: seeds from defaultValue, updates locally, and calls onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 1, onChange }));

    expect(result.current[0]).toBe(1);

    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2, { source: "internal" });

    act(() => result.current[1]((prev) => prev + 10));
    expect(result.current[0]).toBe(12);
    expect(onChange).toHaveBeenLastCalledWith(12, { source: "internal" });
  });

  it("uncontrolled mode: chains updater functions called in the same event", () => {
    const { result } = renderHook(() => useControllableState({ defaultValue: 0 }));
    act(() => {
      result.current[1]((prev) => prev + 1);
      result.current[1]((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(2);
  });

  it("controlled mode: never updates locally, only reports via onChange", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ value }) => useControllableState({ value, onChange }), {
      initialProps: { value: 5 },
    });

    expect(result.current[0]).toBe(5);

    act(() => result.current[1](9));
    // value prop hasn't changed yet, so the returned value is still the prop value
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(9, { source: "internal" });

    rerender({ value: 9 });
    expect(result.current[0]).toBe(9);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("store-backed mode: reads/writes through the store and classifies internal vs external updates", () => {
    const onChange = vi.fn();
    const store = createControllableStore(0);
    const { result } = renderHook(() => useControllableState({ store, onChange }));

    expect(result.current[0]).toBe(0);

    // internal update: driven by the hook's own setter
    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);
    expect(onChange).toHaveBeenLastCalledWith(3, { source: "internal" });

    // external update: something else writes to the store
    act(() => store.setValue(7));
    expect(result.current[0]).toBe(7);
    expect(onChange).toHaveBeenLastCalledWith(7, { source: "external" });
  });

  it("store takes priority over value/defaultValue when both are supplied", () => {
    const store = createControllableStore(42);
    const { result } = renderHook(() => useControllableState({ value: 1, defaultValue: 2, store }));
    expect(result.current[0]).toBe(42);
  });
});

describe("createControllableStore", () => {
  it("replaces rather than merges, so array and object values survive updates intact", () => {
    const order = createControllableStore<string[]>(["a", "b"]);
    order.setValue(["b", "a"]);
    expect(order.getValue()).toEqual(["b", "a"]);
    expect(Array.isArray(order.getValue())).toBe(true);
    const selection = createControllableStore<{ rows: string[]; extra?: number }>({ rows: [], extra: 1 });
    selection.setValue((prev) => ({ rows: [...prev.rows, "x"] }));
    expect(selection.getValue()).toEqual({ rows: ["x"] });
  });

  it("notifies subscribers with the new value until they unsubscribe", () => {
    const store = createControllableStore(1);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.setValue(2);
    unsubscribe();
    store.setValue(3);
    expect(listener.mock.calls).toEqual([[2]]);
  });
});

describe("createZustandStoreController", () => {
  it("reads, writes and follows one slice of a larger store", () => {
    const app = createStore<{ order: string[]; other: number }>(() => ({ order: [], other: 0 }));
    const orderStore = createZustandStoreController(
      app,
      (state) => state.order,
      (store, next) =>
        store.setState((state) => ({ ...state, order: typeof next === "function" ? next(state.order) : next })),
    );
    const listener = vi.fn();
    orderStore.subscribe(listener);

    orderStore.setValue(["b", "a"]);
    expect(app.getState().order).toEqual(["b", "a"]);
    app.setState({ other: 1 });
    expect(listener.mock.calls).toEqual([[["b", "a"]]]);
  });
});
