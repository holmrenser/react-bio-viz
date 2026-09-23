import { describe, expect, it } from "vitest";

import { buildHierarchy, descendants } from "./hierarchy";
import { rerootTree } from "./reroot";
import type { Tree } from "../types";

// A-B-C-D linear chain: A(root) -> B -> C -> D, each edge length 1.
const linear: Tree = {
  ID: "A",
  name: "A",
  length: 0,
  children: [
    {
      ID: "B",
      name: "B",
      length: 1,
      children: [
        {
          ID: "C",
          name: "C",
          length: 1,
          children: [{ ID: "D", name: "D", length: 1, children: [] }],
        },
      ],
    },
  ],
};

// A balanced tree with a multifurcation at the root: root -> (X, Y, Z), X -> (leaf1, leaf2).
const multifurcating: Tree = {
  ID: "root",
  name: "root",
  length: 0,
  children: [
    {
      ID: "X",
      name: "X",
      length: 2,
      children: [
        { ID: "leaf1", name: "leaf1", length: 1, children: [] },
        { ID: "leaf2", name: "leaf2", length: 1, children: [] },
      ],
    },
    { ID: "Y", name: "Y", length: 3, children: [] },
    { ID: "Z", name: "Z", length: 4, children: [] },
  ],
};

function names(tree: Tree): string[] {
  return descendants(buildHierarchy(tree))
    .map((n) => n.data.name)
    .sort();
}

describe("rerootTree", () => {
  it("is a no-op when rerooting at the current root", () => {
    const root = buildHierarchy(linear);
    const rerooted = rerootTree(root, "A");
    expect(rerooted).toBe(root);
  });

  it("is a no-op when the target id doesn't exist", () => {
    const root = buildHierarchy(linear);
    const rerooted = rerootTree(root, "nonexistent");
    expect(rerooted).toBe(root);
  });

  it("preserves every original node and every original branch length, just reattributed", () => {
    const root = buildHierarchy(linear);
    const rerooted = rerootTree(root, "D");

    // Same set of node names.
    expect(names(rerooted.data)).toEqual(["A", "B", "C", "D"]);

    // D is now the root, with a single child chain D -> C -> B -> A, and the edge lengths are
    // the original A-B, B-C, C-D lengths (all 1 here), just walked in the opposite direction.
    expect(rerooted.data.name).toBe("D");
    expect(rerooted.data.length).toBe(0);
    const c = rerooted.data.children[0];
    expect(c.name).toBe("C");
    expect(c.length).toBe(1); // original C-D edge length
    const b = c.children[0];
    expect(b.name).toBe("B");
    expect(b.length).toBe(1); // original B-C edge length
    const a = b.children[0];
    expect(a.name).toBe("A");
    expect(a.length).toBe(1); // original A-B edge length
    expect(a.children).toHaveLength(0);
  });

  it("keeps sibling subtrees attached to the inverted ancestor in a multifurcating tree", () => {
    const root = buildHierarchy(multifurcating);
    const rerooted = rerootTree(root, "leaf1");

    expect(names(rerooted.data)).toEqual(["X", "Y", "Z", "leaf1", "leaf2", "root"]);

    // leaf1 is the new root; its child is X, which keeps leaf2 (its original sibling under X)
    // and gains the inverted old root (carrying Y and Z, X's original siblings) as its other child.
    expect(rerooted.data.name).toBe("leaf1");
    const x = rerooted.data.children[0];
    expect(x.name).toBe("X");
    expect(x.length).toBe(1); // original X-leaf1 edge length

    const leaf2 = x.children.find((c) => c.name === "leaf2");
    expect(leaf2?.length).toBe(1); // original X-leaf2 edge length, untouched

    const invertedOldRoot = x.children.find((c) => c.name === "root");
    expect(invertedOldRoot?.length).toBe(2); // original root-X edge length
    expect(invertedOldRoot?.children.map((c) => c.name).sort()).toEqual(["Y", "Z"]);
    expect(invertedOldRoot?.children.find((c) => c.name === "Y")?.length).toBe(3);
    expect(invertedOldRoot?.children.find((c) => c.name === "Z")?.length).toBe(4);
  });

  it("round-trips: rerooting back to the original root reproduces an equivalent tree", () => {
    const root = buildHierarchy(linear);
    const rerooted = rerootTree(root, "D");
    const rerootedRoot = buildHierarchy(rerooted.data);
    const backToA = rerootTree(rerootedRoot, "A");

    expect(names(backToA.data)).toEqual(names(linear));

    function totalLength(tree: Tree): number {
      return tree.children.reduce((sum, c) => sum + c.length + totalLength(c), 0);
    }
    expect(totalLength(backToA.data)).toBe(totalLength(linear));
  });
});
