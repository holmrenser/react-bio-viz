import { describe, expect, it } from "vitest";

import { parseNewick, toNewick } from "./newick";

describe("Newick", () => {
  it("parses topology, lengths and support labels", () => {
    const tree = parseNewick("((A:0.1,B:0.2)95:0.3,C:0.4);");
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].name).toBe("95");
    expect(tree.children[0].length).toBeCloseTo(0.3);
    expect(tree.children[0].children.map((c) => c.name)).toEqual(["A", "B"]);
    expect(tree.children[1]).toMatchObject({ name: "C", length: 0.4 });
  });

  it("unquotes labels, including escaped quotes and special characters", () => {
    const tree = parseNewick("('sp|Q1|X a, b':1,'it''s':2);");
    expect(tree.children.map((c) => c.name)).toEqual(["sp|Q1|X a, b", "it's"]);
  });

  it("round-trips, quoting names that need it", () => {
    const text = "(('sp|Q1 x':0.1,B:0.2)0.9:0.3,C:0.4);";
    expect(toNewick(parseNewick(text))).toBe("(('sp|Q1 x':0.1,B:0.2)0.9:0.3,C:0.4);");
  });

  it("tolerates whitespace and missing lengths", () => {
    const tree = parseNewick(" ( A , B ) ; ");
    expect(tree.children.map((c) => [c.name, c.length])).toEqual([
      ["A", 0],
      ["B", 0],
    ]);
  });
});
