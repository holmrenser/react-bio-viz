import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useControllableState } from "./useControllableState";
import { createControllableStore, createZustandStoreController } from "./createExternalStoreAdapter";
import type { StoreController } from "./types";

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

  it("controlled mode: never updates locally, only reports via onChange", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, onChange }),
      { initialProps: { value: 5 } }
    );

    expect(result.current[0]).toBe(5);

    act(() => result.current[1](9));
    // value prop hasn't changed yet, so the returned value is still the prop value
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(9, { source: "internal" });

    rerender({ value: 9 });
    expect(result.current[0]).toBe(9);
  });

  it("store-backed mode: reads/writes through the store and classifies internal vs external updates", () => {
    const onChange = vi.fn();
    const store = createControllableStore<number>(0);
    const controller: StoreController<number> = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: number) => number)(prev) : next))
    );

    const { result } = renderHook(() => useControllableState({ store: controller, onChange }));

    expect(result.current[0]).toBe(0);

    // internal update: driven by the hook's own setter
    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);
    expect(onChange).toHaveBeenLastCalledWith(3, { source: "internal" });

    // external update: something else mutates the store directly
    act(() => store.setState(7));
    expect(result.current[0]).toBe(7);
    expect(onChange).toHaveBeenLastCalledWith(7, { source: "external" });
  });

  it("store takes priority over value/defaultValue when both are supplied", () => {
    const store = createControllableStore<number>(42);
    const controller: StoreController<number> = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: number) => number)(prev) : next))
    );

    const { result } = renderHook(() =>
      useControllableState({ value: 1, defaultValue: 2, store: controller })
    );

    expect(result.current[0]).toBe(42);
  });
});

describe("createControllableStore", () => {
  it("replaces rather than merges, so array and object values survive updates intact", () => {
    const order = createControllableStore<string[]>(["a", "b"]);
    order.setState(["b", "a"]);
    expect(order.getState()).toEqual(["b", "a"]);
    expect(Array.isArray(order.getState())).toBe(true);
    const selection = createControllableStore<{ rows: string[]; extra?: number }>({ rows: [], extra: 1 });
    selection.setState((prev) => ({ rows: [...prev.rows, "x"] }));
    expect(selection.getState()).toEqual({ rows: ["x"] });
  });
});
