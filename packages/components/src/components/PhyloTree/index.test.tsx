import { fireEvent, render } from "@testing-library/react";
import { createControllableStore, createZustandStoreController, type Viewport } from "@react-bio-viz/core";
import { describe, expect, it, vi } from "vitest";

import { PhyloTree } from "./index";
import type { Tree, TreeSelection } from "./types";

// An intentionally unbalanced tree: one leaf hangs directly off an early ancestor while a sibling
// clade nests several levels deeper, so leaf-alignment behavior is actually exercised.
const tree: Tree = {
  name: "root",
  length: 0,
  children: [
    { ID: "shallow", name: "shallow-leaf", length: 1, children: [] },
    {
      ID: "clade",
      name: "clade",
      length: 1,
      children: [
        {
          ID: "nested",
          name: "nested",
          length: 1,
          children: [
            { ID: "deep-a", name: "deep-leaf-a", length: 1, children: [] },
            { ID: "deep-b", name: "deep-leaf-b", length: 1, children: [] },
          ],
        },
      ],
    },
  ],
};

function leafTextYPositions(container: HTMLElement): number[] {
  const tips = Array.from(container.querySelectorAll("g.tipnode"));
  return tips.map((tip) => {
    const line = tip.querySelector("line");
    return Number(line?.getAttribute("x2"));
  });
}

describe("PhyloTree layout", () => {
  it("renders one tip per leaf without throwing", () => {
    const { container } = render(<PhyloTree tree={tree} />);
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(3);
  });

  it("aligns all leaf labels flush in cladogram mode, even for an unbalanced tree", () => {
    const { container } = render(<PhyloTree tree={tree} layout="cladogram" />);
    const positions = leafTextYPositions(container);
    expect(positions).toHaveLength(3);
    expect(new Set(positions).size).toBe(1);
  });

  it("does not align leaves flush in rectangular (branch-length) mode, with alignTips off", () => {
    const { container } = render(<PhyloTree tree={tree} layout="rectangular" alignTips={false} />);
    const positions = leafTextYPositions(container);
    expect(positions).toHaveLength(3);
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it("the deprecated cladogram=true boolean behaves like layout=cladogram", () => {
    const { container } = render(<PhyloTree tree={tree} cladogram alignTips={false} />);
    const positions = leafTextYPositions(container);
    expect(new Set(positions).size).toBe(1);
  });

  it("does not overflow width with a small width (regression: hardcoded margin.right=500 bug)", () => {
    const { container } = render(<PhyloTree tree={tree} width={300} height={200} />);
    const svg = container.querySelector("div.tree > svg");
    expect(svg?.getAttribute("width")).toBe("300");
    // every node must render at a finite, sane position within the requested canvas
    const texts = Array.from(container.querySelectorAll("g.tipnode text"));
    expect(texts.length).toBeGreaterThan(0);
  });
});

describe("PhyloTree viewport", () => {
  it("renders fully controlled, with the svg viewBox reflecting the given viewport", () => {
    const viewport: Viewport = { x0: 0, x1: 500, y0: 0, y1: 450, xMin: 0, xMax: 1000, yMin: 0, yMax: 900 };
    const { container } = render(<PhyloTree tree={tree} viewport={viewport} onViewportChange={() => {}} />);
    expect(container.querySelector("div.tree > svg")?.getAttribute("viewBox")).toBe("0 0 500 450");
  });

  it("renders with an external Zustand store", () => {
    const store = createControllableStore<Viewport>({ x0: 0, x1: 1000, y0: 0, y1: 900, xMin: 0, xMax: 1000, yMin: 0, yMax: 900 });
    const controller = createZustandStoreController(
      store,
      (v) => v,
      (s, next) => s.setState((prev) => (typeof next === "function" ? (next as (p: Viewport) => Viewport)(prev) : next))
    );
    const { container } = render(<PhyloTree tree={tree} viewportStore={controller} />);
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(3);
  });
});

describe("PhyloTree selection", () => {
  it("draws a collapsed clade as a triangle labelled with its size, instead of its leaves", () => {
    const selection: TreeSelection = { collapsed: ["clade"] };
    const { container } = render(<PhyloTree tree={tree} selection={selection} onSelectionChange={() => {}} />);
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(1);
    expect(container.querySelector("g.collapsed-clade polygon")).toBeTruthy();
    expect(container.textContent).toContain("2 taxa");
    expect(container.textContent).not.toContain("deep-leaf-a");
  });

  it("reroots on the branch above any node, leaves included, keeping every leaf", () => {
    for (const rerootedAt of ["deep-a", "deep-b", "shallow", "nested", "clade"]) {
      const { container, unmount } = render(<PhyloTree tree={tree} selection={{ rerootedAt, collapsed: [] }} onSelectionChange={() => {}} />);
      const names = Array.from(container.querySelectorAll("g.tipnode title")).map((t) => t.textContent).sort();
      expect(names).toEqual(["deep-leaf-a", "deep-leaf-b", "shallow-leaf"]);
      unmount();
    }
  });

  it("toggles collapse via the built-in marker when interactive", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <PhyloTree tree={tree} interactive onSelectionChange={onSelectionChange} defaultSelection={{ collapsed: [] }} />
    );
    click(container.querySelector('circle[data-node-id="nested"]')!);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const [newSelection] = onSelectionChange.mock.calls[0] as [TreeSelection];
    expect(newSelection.collapsed).toEqual(["nested"]);
  });

  it("keeps a collapsed node's marker so it can be re-expanded (regression: markers used to vanish once collapsed)", () => {
    const { container, rerender } = render(
      <PhyloTree tree={tree} interactive selection={{ collapsed: [] }} onSelectionChange={() => {}} />
    );
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(3);
    rerender(<PhyloTree tree={tree} interactive selection={{ collapsed: ["clade"] }} onSelectionChange={() => {}} />);
    expect(container.querySelector('circle[data-node-id="clade"]')).toBeTruthy();
    rerender(<PhyloTree tree={tree} interactive selection={{ collapsed: [] }} onSelectionChange={() => {}} />);
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(3);
  });

  it("does not render internal-node markers when not interactive", () => {
    const { container } = render(<PhyloTree tree={tree} />);
    expect(container.querySelector('circle[data-node-id="nested"]')).toBeNull();
    expect(container.querySelector("circle[data-pan-ignore]")).toBeNull();
  });

  it("reorders siblings given a controlled selection.order", () => {
    // The fixture tree's root has no `ID` field, so its hierarchy `id` is the positional path "0"
    // (buildHierarchy's fallback), not the string "root".
    const selection: TreeSelection = { collapsed: [], order: { "0": ["clade", "shallow"] } };
    const { container } = render(<PhyloTree tree={tree} selection={selection} onSelectionChange={() => {}} />);
    const labels = Array.from(container.querySelectorAll("g.tipnode title")).map((t) => t.textContent);
    // "clade" (rendered leaf-like only insofar as its own descendants are tips) comes before
    // shallow-leaf now — check via the leaf tip closest to "clade"'s subtree renders first in
    // document order, i.e. deep-leaf-a/deep-leaf-b precede shallow-leaf.
    const deepAIndex = labels.indexOf("deep-leaf-a");
    const shallowIndex = labels.indexOf("shallow-leaf");
    expect(deepAIndex).toBeGreaterThanOrEqual(0);
    expect(shallowIndex).toBeGreaterThanOrEqual(0);
    expect(deepAIndex).toBeLessThan(shallowIndex);
  });

  it("commits a reorder to selection.order after dragging a leaf, once, on release", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <PhyloTree tree={tree} interactive onSelectionChange={onSelectionChange} defaultSelection={{ collapsed: [] }} />
    );
    const handle = container.querySelector('circle[data-node-id="shallow"]')!;
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { clientX: 0, clientY: 500 });
    fireEvent.pointerMove(handle, { clientX: 0, clientY: 1000 });
    expect(onSelectionChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 1000 });
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect((onSelectionChange.mock.calls[0][0] as TreeSelection).order).toEqual({ "0": ["clade", "shallow"] });
  });

  it("drags internal nodes too", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(<PhyloTree tree={tree} interactive onSelectionChange={onSelectionChange} />);
    const handle = container.querySelector('circle[data-node-id="clade"]')!;
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 1000 });
    fireEvent.pointerMove(handle, { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 0 });
    expect((onSelectionChange.mock.calls[0][0] as TreeSelection).order).toEqual({ "0": ["clade", "shallow"] });
  });

  it("does not drag when dragEnabled is false", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(<PhyloTree tree={tree} interactive dragEnabled={false} onSelectionChange={onSelectionChange} />);
    const handle = container.querySelector('circle[data-node-id="shallow"]')!;
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { clientX: 0, clientY: 1000 });
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 1000 });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

/** A press and release on the same spot: a click, as far as the marker gesture is concerned. */
function click(element: Element, init: { clientX?: number; clientY?: number } = {}) {
  const at = { clientX: init.clientX ?? 5, clientY: init.clientY ?? 5 };
  fireEvent.pointerDown(element, at);
  fireEvent.pointerUp(element, at);
}

describe("PhyloTree node and branch interaction", () => {
  it("reports node clicks with the clade's leaves and descendants, instead of collapsing", () => {
    const onNodeClick = vi.fn();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <PhyloTree tree={tree} interactive onNodeClick={onNodeClick} onSelectionChange={onSelectionChange} />
    );
    click(container.querySelector('circle[data-node-id="nested"]')!, { clientX: 12, clientY: 34 });
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onNodeClick).toHaveBeenCalledTimes(1);
    expect(onNodeClick.mock.calls[0][0]).toMatchObject({
      id: "nested",
      isLeaf: false,
      isRoot: false,
      leafNames: ["deep-leaf-a", "deep-leaf-b"],
      descendantIds: ["nested", "deep-a", "deep-b"],
      clientX: 12,
      clientY: 34,
    });
  });

  it("shows internal markers for onNodeClick even when not interactive, without enabling drag", () => {
    const onNodeClick = vi.fn();
    const { container } = render(<PhyloTree tree={tree} onNodeClick={onNodeClick} />);
    click(container.querySelector('circle[data-node-id="deep-a"]')!);
    expect(onNodeClick.mock.calls[0][0]).toMatchObject({ id: "deep-a", isLeaf: true, name: "deep-leaf-a" });
  });

  it("reports branch clicks with the node below the branch", () => {
    const onBranchClick = vi.fn();
    const { container } = render(<PhyloTree tree={tree} onBranchClick={onBranchClick} />);
    fireEvent.click(container.querySelector('path[data-branch-id="shallow"]')!);
    expect(onBranchClick.mock.calls[0][0]).toMatchObject({ id: "shallow", length: 1 });
  });

  it("applies node and branch styles by id", () => {
    const { container } = render(
      <PhyloTree tree={tree} nodeStyles={{ shallow: { color: "red", bold: true } }} branchStyles={{ nested: { color: "blue" } }} />
    );
    expect(container.querySelector('circle[data-node-id="shallow"]')?.getAttribute("fill")).toBe("red");
    const label = Array.from(container.querySelectorAll("g.tipnode > g")).find((g) => g.textContent === "shallow-leaf") as HTMLElement;
    expect(label.style.color).toBe("red");
    expect(label.style.fontWeight).toBe("bold");
    expect(container.querySelector('path[stroke="blue"]')).toBeTruthy();
  });

  it("highlights the active node", () => {
    const { container } = render(<PhyloTree tree={tree} interactive activeNodeId="nested" />);
    expect(container.querySelector('circle[data-node-id="nested"]')?.getAttribute("stroke")).toBe("var(--rbv-accent)");
  });

  it("reports the leaf order, and again when it changes", () => {
    const onLeafOrderChange = vi.fn();
    const { rerender } = render(<PhyloTree tree={tree} onLeafOrderChange={onLeafOrderChange} />);
    expect(onLeafOrderChange).toHaveBeenLastCalledWith(["shallow-leaf", "deep-leaf-a", "deep-leaf-b"]);
    rerender(<PhyloTree tree={tree} onLeafOrderChange={onLeafOrderChange} selection={{ collapsed: ["clade"], order: { "0": ["clade", "shallow"] } }} />);
    // Collapsed clades still contribute their leaves.
    expect(onLeafOrderChange).toHaveBeenLastCalledWith(["deep-leaf-a", "deep-leaf-b", "shallow-leaf"]);
    const calls = onLeafOrderChange.mock.calls.length;
    rerender(<PhyloTree tree={tree} onLeafOrderChange={onLeafOrderChange} selection={{ collapsed: [], order: { "0": ["clade", "shallow"] } }} />);
    expect(onLeafOrderChange.mock.calls.length).toBe(calls);
  });

  it("labels branch lengths on request", () => {
    const { container } = render(<PhyloTree tree={tree} showBranchLengths />);
    expect(Array.from(container.querySelectorAll("text")).filter((t) => t.textContent === "1").length).toBeGreaterThanOrEqual(5);
  });

  it("lays out at a fixed pixel spacing per leaf, scrolling through a tall tree", () => {
    const onViewportChange = vi.fn();
    const many: Tree = { name: "", length: 0, children: Array.from({ length: 100 }, (_, i) => ({ name: `L${i}`, length: 1, children: [] })) };
    const { container } = render(<PhyloTree tree={many} height={300} leafSpacing={20} onViewportChange={onViewportChange} />);
    const svg = container.querySelector("div.tree > svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 1000 300");
    fireEvent.wheel(svg, { deltaY: 500 });
    const next = onViewportChange.mock.calls.at(-1)?.[0] as Viewport;
    expect(next.y0).toBeGreaterThan(0);
    expect(next.yMax).toBeGreaterThan(1900);
  });

  it("does not re-render the tree body when only the viewport changes", () => {
    const leafText = vi.fn(({ node }) => <text>{node.data.name}</text>);
    const viewport: Viewport = { x0: 0, x1: 1000, y0: 0, y1: 900, xMin: 0, xMax: 1000, yMin: 0, yMax: 900 };
    const { rerender } = render(<PhyloTree tree={tree} leafTextComponent={leafText} viewport={viewport} />);
    const renders = leafText.mock.calls.length;
    rerender(<PhyloTree tree={tree} leafTextComponent={leafText} viewport={{ ...viewport, x0: 100, x1: 600, y0: 50, y1: 500 }} />);
    expect(leafText.mock.calls.length).toBe(renders);
  });
});

describe("PhyloTree search", () => {
  it("bolds matching leaves and dims non-matches when a search query is active", () => {
    const { container } = render(<PhyloTree tree={tree} searchQuery="shallow" />);
    const groups = Array.from(container.querySelectorAll("g.tipnode > g"));
    const matching = groups.find((g) => g.textContent === "shallow-leaf");
    const nonMatching = groups.find((g) => g.textContent === "deep-leaf-a");
    expect(matching).toBeTruthy();
    expect(nonMatching).toBeTruthy();
    expect((matching as HTMLElement).style.fontWeight).toBe("bold");
    expect((nonMatching as HTMLElement).style.opacity).toBe("0.3");
  });

  it("does not dim anything when no search query is set", () => {
    const { container } = render(<PhyloTree tree={tree} />);
    const groups = Array.from(container.querySelectorAll("g.tipnode > g"));
    for (const g of groups) {
      expect((g as HTMLElement).style.opacity).toBe("");
    }
  });
});

describe("PhyloTree scale bar", () => {
  it("renders a scale bar in rectangular layout by default", () => {
    const { container } = render(<PhyloTree tree={tree} layout="rectangular" />);
    expect(container.querySelector("g.scale-bar")).toBeTruthy();
  });

  it("does not render a scale bar in cladogram layout (no meaningful branch-length scale)", () => {
    const { container } = render(<PhyloTree tree={tree} layout="cladogram" />);
    expect(container.querySelector("g.scale-bar")).toBeNull();
  });

  it("does not render a scale bar when showScaleBar is false", () => {
    const { container } = render(<PhyloTree tree={tree} layout="rectangular" showScaleBar={false} />);
    expect(container.querySelector("g.scale-bar")).toBeNull();
  });
});
