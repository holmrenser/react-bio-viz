import { describe, expect, it } from "vitest";

import { parseNewick } from "./newick";
import {
  applyTreeSelection,
  collapseBySupport,
  ladderizeOrder,
  leafOrder,
  orderForLeafNames,
  planDragReroot,
  planTipMove,
  rerootAbove,
  rotateOrder,
} from "./treeOps";

// Root "0" → [A (path 0.0), clade "0.1" → [B, clade "0.1.1" → [C, D]]]
const tree = parseNewick("(A:1,(B:1,(C:1,D:1)40:1)90:1);");

describe("tree operations", () => {
  it("reports leaf order for a selection", () => {
    expect(leafOrder(tree)).toEqual(["A", "B", "C", "D"]);
    expect(leafOrder(tree, { order: { "0": ["0.1", "0.0"] } })).toEqual(["B", "C", "D", "A"]);
  });

  it("ladderizes by clade size in either direction", () => {
    expect(leafOrder(tree, { order: ladderizeOrder(tree, {}, "desc") })).toEqual(["C", "D", "B", "A"]);
    expect(leafOrder(tree, { order: ladderizeOrder(tree, {}, "asc") })).toEqual(["A", "B", "C", "D"]);
  });

  it("rotates one node's children", () => {
    expect(leafOrder(tree, { order: rotateOrder(tree, {}, "0.1.1") })).toEqual(["A", "B", "D", "C"]);
    expect(leafOrder(tree, { order: rotateOrder(tree, {}, "0") })).toEqual(["B", "C", "D", "A"]);
  });

  it("follows a requested leaf order as far as the topology allows", () => {
    expect(leafOrder(tree, { order: orderForLeafNames(tree, {}, ["D", "C", "A", "B"]) })).toEqual(["D", "C", "B", "A"]);
  });

  it("applies reroot and order to plain data, for export", () => {
    const rerooted = applyTreeSelection(tree, { rerootedAt: "0.0", collapsed: [] });
    expect(rerooted.children.map((c) => c.name)).toContain("A");
    expect(leafOrder(rerooted).sort()).toEqual(["A", "B", "C", "D"]);
  });

  it("collapses poorly supported clades into polytomies, adding their branch length to children", () => {
    const collapsed = collapseBySupport(tree, 50);
    const clade = collapsed.children[1];
    expect(clade.name).toBe("90");
    expect(clade.children.map((c) => c.name)).toEqual(["B", "C", "D"]);
    expect(clade.children[1].length).toBeCloseTo(2);
    expect(collapseBySupport(tree, 10)).toBe(tree);
  });
});

describe("drag and reroot planning", () => {
  // ((A:1,B:1)AB:2,(C:1,D:1)CD:2)root; with explicit ids.
  const ids = parseNewick("((A:1,B:1)AB:2,(C:1,D:1)CD:2);");
  ids.children[0].ID = "AB";
  ids.children[1].ID = "CD";
  ids.children[0].children[0].ID = "A";
  ids.children[1].children[1].ID = "D";

  it("roots halfway along the displayed branch above a node", () => {
    expect(rerootAbove(ids, {}, "A")).toEqual({ rerootedAt: "A", rerootPosition: 0.5 });
    expect(rerootAbove(ids, {}, "0")).toBeNull();
  });

  it("maps a displayed branch that runs through the dissolved old root back to the original tree", () => {
    // Rerooted on A: CD now hangs off AB by a merged 2 + 2 branch; its midpoint is the old root.
    const selection = { rerootedAt: "A", collapsed: [] };
    const reroot = rerootAbove(ids, selection, "CD")!;
    const rerooted = applyTreeSelection(ids, { ...selection, ...reroot });
    // Root-to-tip: C and D are 2 + 1 away, A and B 2 + 1 — the tree is rooted where it started.
    expect(rerooted.children.map((c) => c.length)).toEqual([2, 2]);
  });

  it("plans a tip move by rotation only", () => {
    const order = planTipMove(ids, { collapsed: [] }, "D", 0)!;
    expect(leafOrder(ids, { order })).toEqual(["D", "C", "A", "B"]);
    expect(planTipMove(ids, { collapsed: [] }, "A", 0)).toBeNull();
  });

  it("plans a drag reroot with the dragged clade at either end", () => {
    expect(leafOrder(ids, planDragReroot(ids, { collapsed: [] }, "D", "above")!)[0]).toBe("D");
    expect(leafOrder(ids, planDragReroot(ids, { collapsed: [] }, "D", "below")!).at(-1)).toBe("D");
  });
});
