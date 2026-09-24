import { describe, expect, it } from "vitest";

import { parseNewick } from "./newick";
import {
  applyTreeSelection,
  collapseBySupport,
  ladderizeOrder,
  leafOrder,
  orderForLeafNames,
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
