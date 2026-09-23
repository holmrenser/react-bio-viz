import { describe, expect, it } from "vitest";

import { computeRadialLayout } from "./radial";
import { buildHierarchy, descendants } from "../utils/hierarchy";
import type { Tree } from "../types";

const tree: Tree = {
  name: "root",
  length: 0,
  children: [
    { name: "A", length: 1, children: [] },
    {
      name: "inner",
      length: 0.5,
      children: [
        { name: "B", length: 0.5, children: [] },
        { name: "C", length: 1.5, children: [] },
      ],
    },
    { name: "D", length: 2, children: [] },
  ],
};

function layout(sizeX = 400, sizeY = 400) {
  const root = buildHierarchy(tree);
  const result = computeRadialLayout(root, sizeX, sizeY);
  return { root, result, nodes: descendants(root) };
}

describe("computeRadialLayout", () => {
  it("reports the circle's centre and radius", () => {
    const { result } = layout(400, 600);
    expect(result.center).toEqual({ cx: 300, cy: 200 });
    // The circle is sized by whichever dimension is tighter.
    expect(result.maxRadius).toBe(200);
  });

  it("gives every node a radius and an angle", () => {
    const { nodes } = layout();
    for (const node of nodes) {
      expect(typeof node.radius).toBe("number");
      expect(typeof node.angle).toBe("number");
    }
  });

  it("puts the root at the centre", () => {
    const { root, result } = layout();
    expect(root.radius).toBe(0);
    expect(root.x).toBeCloseTo(result.center!.cy);
    expect(root.y).toBeCloseTo(result.center!.cx);
  });

  it("spreads the leaves evenly over a full turn", () => {
    const { nodes } = layout();
    const leafAngles = nodes.filter((n) => !n.children?.length).map((n) => n.angle!);
    expect(leafAngles).toHaveLength(4);
    const step = (2 * Math.PI) / 4;
    leafAngles.forEach((angle, index) => expect(angle).toBeCloseTo(index * step));
  });

  it("centres an internal node between its first and last child's angles", () => {
    const { nodes } = layout();
    const inner = nodes.find((n) => n.data.name === "inner")!;
    const [first, last] = inner.children!;
    expect(inner.angle).toBeCloseTo((first.angle! + last.angle!) / 2);
  });

  it("scales radius by cumulative branch length, with the deepest tip at maxRadius", () => {
    const { nodes, result } = layout();
    // Deepest path is root(0) -> inner(0.5) -> C(1.5) = 2.0, tied with D(2.0).
    const deepest = nodes.find((n) => n.data.name === "C")!;
    expect(deepest.radius).toBeCloseTo(result.maxRadius!);
    const shallow = nodes.find((n) => n.data.name === "B")!;
    expect(shallow.radius).toBeCloseTo(result.maxRadius! / 2);
  });

  it("writes cartesian x/y consistent with its own radius and angle", () => {
    const { nodes, result } = layout();
    const { cx, cy } = result.center!;
    for (const node of nodes) {
      expect(node.y).toBeCloseTo(cx + node.radius! * Math.cos(node.angle!));
      expect(node.x).toBeCloseTo(cy + node.radius! * Math.sin(node.angle!));
    }
  });

  it("reports a scaling factor so a scale bar can be drawn", () => {
    const { result } = layout();
    expect(result.scalingFactor).toBeCloseTo(200 / 2);
  });

  it("does not divide by zero on a zero-length tree", () => {
    const flat: Tree = { name: "root", length: 0, children: [{ name: "A", length: 0, children: [] }] };
    const root = buildHierarchy(flat);
    const result = computeRadialLayout(root, 200, 200);
    expect(Number.isFinite(result.scalingFactor!)).toBe(true);
    expect(Number.isFinite(root.x)).toBe(true);
  });
});
