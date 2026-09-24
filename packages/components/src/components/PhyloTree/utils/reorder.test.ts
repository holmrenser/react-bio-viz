import { describe, expect, it } from "vitest";

import { buildHierarchy, descendants } from "./hierarchy";
import { applyOrder, computeReordered } from "./reorder";
import type { Tree } from "../types";

describe("computeReordered", () => {
  it("moves an id to the target index, keeping the rest in order", () => {
    expect(computeReordered(["a", "b", "c", "d"], "a", 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("clamps the target index to the valid range", () => {
    expect(computeReordered(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
    expect(computeReordered(["a", "b", "c"], "c", -5)).toEqual(["c", "a", "b"]);
  });

  it("is a no-op when the id is already at the target index", () => {
    expect(computeReordered(["a", "b", "c"], "b", 1)).toEqual(["a", "b", "c"]);
  });
});

const tree: Tree = {
  ID: "root",
  name: "root",
  length: 0,
  children: [
    { ID: "a", name: "a", length: 1, children: [] },
    { ID: "b", name: "b", length: 1, children: [] },
    { ID: "c", name: "c", length: 1, children: [] },
  ],
};

describe("applyOrder", () => {
  it("returns the same tree when order is empty", () => {
    const root = buildHierarchy(tree);
    expect(applyOrder(root, {})).toBe(root);
  });

  it("reorders a node's direct children per the given order", () => {
    const root = buildHierarchy(tree);
    const reordered = applyOrder(root, { root: ["c", "a", "b"] });
    expect(reordered.children?.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("appends children missing from the order map after the ordered ones", () => {
    const root = buildHierarchy(tree);
    const reordered = applyOrder(root, { root: ["b"] });
    expect(reordered.children?.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });

  it("ignores ids in the order map that aren't actually children of that node", () => {
    const root = buildHierarchy(tree);
    const reordered = applyOrder(root, { root: ["c", "nonexistent", "a", "b"] });
    expect(reordered.children?.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("does not lose any nodes", () => {
    const root = buildHierarchy(tree);
    const reordered = applyOrder(root, { root: ["c", "a", "b"] });
    expect(descendants(reordered).map((n) => n.id).sort()).toEqual(descendants(root).map((n) => n.id).sort());
  });
});

describe("applyOrder parent links", () => {
  it("points every child at its parent in the reordered tree, not the original one", () => {
    const tree: Tree = {
      name: "root",
      length: 0,
      children: [
        { ID: "a", name: "a", length: 1, children: [] },
        {
          ID: "bc",
          name: "bc",
          length: 1,
          children: [
            { ID: "b", name: "b", length: 1, children: [] },
            { ID: "c", name: "c", length: 1, children: [] },
          ],
        },
      ],
    };
    const reordered = applyOrder(buildHierarchy(tree), { "0": ["bc", "a"] });
    for (const node of descendants(reordered)) {
      for (const child of node.children ?? []) expect(child.parent).toBe(node);
    }
  });
});
