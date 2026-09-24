import { describe, expect, it } from "vitest";

import { midpointRoot } from "./midpoint";
import { buildHierarchy, descendants } from "./hierarchy";
import { rerootOnBranch } from "./reroot";
import type { Tree } from "../types";

const leaf = (name: string, length: number): Tree => ({ ID: name, name, length, children: [] });

function rootToTipDistances(tree: Tree, selection: ReturnType<typeof midpointRoot>): Record<string, number> {
  let root = buildHierarchy(tree);
  if (selection.rerootedAt) root = rerootOnBranch(root, selection.rerootedAt, selection.rerootPosition);
  const out: Record<string, number> = {};
  (function walk(node: typeof root, distance: number) {
    const here = distance + (node.parent ? node.data.length : 0);
    if (!node.children) out[node.data.name] = here;
    node.children?.forEach((child) => walk(child, here));
  })(root, 0);
  return out;
}

describe("midpointRoot", () => {
  it("roots halfway along the longest leaf-to-leaf path", () => {
    // Longest path: A(10) … B(2) through the root = 12; midpoint is 6 from A, on A's own branch.
    const tree: Tree = { name: "", length: 0, children: [leaf("A", 10), { ID: "in", name: "", length: 1, children: [leaf("B", 1), leaf("C", 0.5)] }] };
    const selection = midpointRoot(tree);
    expect(selection.rerootedAt).toBe("A");
    expect(selection.rerootPosition).toBeCloseTo(0.6);
    const distances = rootToTipDistances(tree, selection);
    expect(distances.A).toBeCloseTo(6);
    expect(distances.B).toBeCloseTo(6);
  });

  it("measures the position from the child end when the midpoint lies on a branch walked downwards", () => {
    const tree: Tree = { name: "", length: 0, children: [leaf("A", 1), { ID: "in", name: "", length: 1, children: [leaf("B", 10), leaf("C", 1)] }] };
    const distances = rootToTipDistances(tree, midpointRoot(tree));
    expect(distances.A).toBeCloseTo(distances.B);
  });

  it("does nothing for a tree with fewer than two leaves", () => {
    expect(midpointRoot(leaf("solo", 1))).toEqual({});
  });

  it("keeps every leaf", () => {
    const tree: Tree = { name: "", length: 0, children: [leaf("A", 3), leaf("B", 1), { name: "", length: 2, children: [leaf("C", 1), leaf("D", 4)] }] };
    const selection = midpointRoot(tree);
    const root = rerootOnBranch(buildHierarchy(tree), selection.rerootedAt!, selection.rerootPosition);
    expect(descendants(root).filter((n) => !n.children)).toHaveLength(4);
  });
});
