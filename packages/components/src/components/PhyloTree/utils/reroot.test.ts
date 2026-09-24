import { describe, expect, it } from "vitest";

import { buildHierarchy, descendants } from "./hierarchy";
import { REROOT_ID, rerootOnBranch } from "./reroot";
import type { HierarchyPointNode, Tree } from "../types";

// ((A:1,B:2)AB:3,(C:4,D:5)CD:6)root;
const binary: Tree = {
  name: "root",
  length: 0,
  children: [
    {
      ID: "AB",
      name: "AB",
      length: 3,
      children: [
        { ID: "A", name: "A", length: 1, children: [] },
        { ID: "B", name: "B", length: 2, children: [] },
      ],
    },
    {
      ID: "CD",
      name: "CD",
      length: 6,
      children: [
        { ID: "C", name: "C", length: 4, children: [] },
        { ID: "D", name: "D", length: 5, children: [] },
      ],
    },
  ],
};

// root -> (X(leaf1, leaf2), Y, Z): a multifurcating root.
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

type Node = HierarchyPointNode<Tree>;
const leaves = (root: Node) => descendants(root).filter((n) => !n.children).map((n) => n.data.name).sort();
const totalLength = (root: Node) => descendants(root).reduce((sum, n) => sum + (n.parent ? n.data.length : 0), 0);
const byId = (root: Node, id: string) => descendants(root).find((n) => n.id === id)!;

describe("rerootOnBranch", () => {
  it("inserts a bifurcating root on the branch above a leaf, keeping every leaf", () => {
    const original = buildHierarchy(binary);
    const rerooted = rerootOnBranch(original, "A");
    expect(rerooted.id).toBe(REROOT_ID);
    expect(rerooted.children).toHaveLength(2);
    expect(leaves(rerooted)).toEqual(["A", "B", "C", "D"]);
    // A hangs directly off the new root, with half its branch.
    expect(byId(rerooted, "A").parent?.id).toBe(REROOT_ID);
    expect(byId(rerooted, "A").data.length).toBeCloseTo(0.5);
  });

  it("preserves total branch length, dissolving the old binary root", () => {
    const original = buildHierarchy(binary);
    for (const id of ["A", "B", "C", "D", "AB", "CD"]) {
      const rerooted = rerootOnBranch(original, id);
      expect(totalLength(rerooted)).toBeCloseTo(totalLength(original));
      expect(leaves(rerooted)).toEqual(["A", "B", "C", "D"]);
      // The old root had two children; once re-hung it would be unary, so it must be gone.
      expect(descendants(rerooted).some((n) => n.id === "0")).toBe(false);
    }
  });

  it("merges the old root's two edges into one when rerooting inside a clade", () => {
    const rerooted = rerootOnBranch(buildHierarchy(binary), "A");
    // AB now hangs below A's new root; CD reaches AB through the dissolved root: 3 + 6.
    expect(byId(rerooted, "CD").parent?.id).toBe("AB");
    expect(byId(rerooted, "CD").data.length).toBeCloseTo(9);
  });

  it("places the root at the requested fraction of the branch", () => {
    const rerooted = rerootOnBranch(buildHierarchy(binary), "C", 0.25);
    expect(byId(rerooted, "C").data.length).toBeCloseTo(1);
    const other = rerooted.children!.find((n) => n.id !== "C")!;
    expect(other.id).toBe("CD");
    expect(other.data.length).toBeCloseTo(3);
  });

  it("keeps ids stable, so a node can be addressed before and after", () => {
    const original = buildHierarchy(binary);
    const ids = descendants(original).map((n) => n.id).filter((id) => id !== "0").sort();
    const rerooted = rerootOnBranch(original, "D");
    expect(descendants(rerooted).map((n) => n.id).filter((id) => id !== REROOT_ID).sort()).toEqual(ids);
  });

  it("keeps a multifurcating old root as an internal node", () => {
    const rerooted = rerootOnBranch(buildHierarchy(multifurcating), "leaf1");
    const oldRoot = byId(rerooted, "root");
    expect(oldRoot.children?.map((n) => n.id).sort()).toEqual(["Y", "Z"]);
    expect(totalLength(rerooted)).toBeCloseTo(totalLength(buildHierarchy(multifurcating)));
  });

  it("is a no-op for the root or an unknown id", () => {
    const original = buildHierarchy(binary);
    expect(rerootOnBranch(original, "0")).toBe(original);
    expect(rerootOnBranch(original, "nope")).toBe(original);
  });

  it("links parents, depth and data.children consistently", () => {
    const rerooted = rerootOnBranch(buildHierarchy(binary), "B");
    for (const node of descendants(rerooted)) {
      for (const child of node.children ?? []) {
        expect(child.parent).toBe(node);
        expect(child.depth).toBe(node.depth + 1);
      }
      expect(node.data.children).toHaveLength(node.children?.length ?? 0);
    }
  });
});
