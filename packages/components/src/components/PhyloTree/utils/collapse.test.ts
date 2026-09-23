import { describe, expect, it } from "vitest";

import { buildHierarchy, descendants } from "./hierarchy";
import { pruneCollapsed } from "./collapse";
import type { Tree } from "../types";

const tree: Tree = {
  ID: "root",
  name: "root",
  length: 0,
  children: [
    {
      ID: "clade",
      name: "clade",
      length: 1,
      children: [
        { ID: "a", name: "a", length: 1, children: [] },
        { ID: "b", name: "b", length: 1, children: [] },
      ],
    },
    { ID: "c", name: "c", length: 1, children: [] },
  ],
};

describe("pruneCollapsed", () => {
  it("returns the same tree when nothing is collapsed", () => {
    const root = buildHierarchy(tree);
    expect(pruneCollapsed(root, [])).toBe(root);
  });

  it("removes the collapsed node's descendants, treating it as a leaf", () => {
    const root = buildHierarchy(tree);
    const pruned = pruneCollapsed(root, ["clade"]);

    const ids = descendants(pruned).map((n) => n.id);
    expect(ids).toContain("clade");
    expect(ids).not.toContain("a");
    expect(ids).not.toContain("b");
    expect(ids).toContain("c");

    const clade = descendants(pruned).find((n) => n.id === "clade");
    expect(clade?.children).toBeUndefined();
  });

  it("does not mutate the original hierarchy", () => {
    const root = buildHierarchy(tree);
    pruneCollapsed(root, ["clade"]);
    const clade = descendants(root).find((n) => n.id === "clade");
    expect(clade?.children).toHaveLength(2);
  });
});
