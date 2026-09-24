import { describe, expect, it } from "vitest";

import { moveItem, resolveRowOrder } from "./rowOrder";

describe("resolveRowOrder", () => {
  const ids = ["a", "b", "c", "d"];

  it("is the identity without an order", () => {
    expect(resolveRowOrder(ids, undefined)).toEqual([0, 1, 2, 3]);
    expect(resolveRowOrder(ids, [])).toEqual([0, 1, 2, 3]);
  });

  it("follows the order, ignores unknown ids and appends unmentioned rows", () => {
    expect(resolveRowOrder(ids, ["c", "zzz", "a"])).toEqual([2, 0, 1, 3]);
  });

  it("ignores repeated ids", () => {
    expect(resolveRowOrder(ids, ["b", "b", "a"])).toEqual([1, 0, 2, 3]);
  });
});

describe("moveItem", () => {
  it("moves forwards and backwards", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
});
