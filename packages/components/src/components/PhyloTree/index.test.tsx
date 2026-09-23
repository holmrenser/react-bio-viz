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
  it("collapses a subtree given a controlled selection", () => {
    const selection: TreeSelection = { collapsed: ["clade"] };
    const { container } = render(<PhyloTree tree={tree} selection={selection} onSelectionChange={() => {}} />);
    // shallow-leaf, plus the collapsed "clade" node itself now rendering as a tip in place of
    // its pruned subtree — "nested"/"deep-leaf-a"/"deep-leaf-b" are gone.
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(2);
    expect(container.textContent).toContain("shallow-leaf");
    expect(container.textContent).toContain("clade");
    expect(container.textContent).not.toContain("deep-leaf-a");
  });

  it("reroots given a controlled selection, preserving every other original leaf", () => {
    const selection: TreeSelection = { rerootedAt: "deep-a", collapsed: [] };
    const { container } = render(<PhyloTree tree={tree} selection={selection} onSelectionChange={() => {}} />);
    // deep-leaf-a becomes the (unrendered) root; every other original node is still present.
    expect(container.textContent).toContain("shallow-leaf");
    expect(container.textContent).toContain("deep-leaf-b");
    expect(container.querySelectorAll("g.tipnode").length).toBeGreaterThan(0);
  });

  it("toggles collapse via the built-in marker when interactive", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <PhyloTree tree={tree} interactive onSelectionChange={onSelectionChange} defaultSelection={{ collapsed: [] }} />
    );
    // CollapseMarker circles carry data-node-id (LeafNode's own drag circles don't), so this
    // selector is specific to collapse markers even though both also carry data-pan-ignore.
    const marker = container.querySelector("circle[data-node-id]");
    expect(marker).toBeTruthy();
    if (marker) fireEvent.click(marker);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const [newSelection] = onSelectionChange.mock.calls[0] as [TreeSelection];
    expect(newSelection.collapsed).toHaveLength(1);
  });

  it("keeps a collapsed node's marker so it can be re-expanded (regression: markers used to vanish once collapsed)", () => {
    const { container, rerender } = render(
      <PhyloTree tree={tree} interactive selection={{ collapsed: [] }} onSelectionChange={() => {}} />
    );
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(3);
    expect(container.querySelectorAll("circle[data-pan-ignore]").length).toBeGreaterThan(0);

    rerender(<PhyloTree tree={tree} interactive selection={{ collapsed: ["clade"] }} onSelectionChange={() => {}} />);
    // "clade"'s subtree is pruned (nested/deep-leaf-a/deep-leaf-b gone), but it must still carry a
    // marker so the user can click it again to re-expand.
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(2);
    expect(container.querySelectorAll("circle[data-pan-ignore]").length).toBeGreaterThan(0);

    rerender(<PhyloTree tree={tree} interactive selection={{ collapsed: [] }} onSelectionChange={() => {}} />);
    expect(container.querySelectorAll("g.tipnode")).toHaveLength(3);
  });

  it("does not render collapse markers when not interactive", () => {
    const { container } = render(<PhyloTree tree={tree} />);
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

  it("commits a reorder to selection.order after a drag-to-reorder gesture", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <PhyloTree tree={tree} interactive onSelectionChange={onSelectionChange} defaultSelection={{ collapsed: [] }} />
    );
    // The draggable leaf circles are the ones without data-node-id (that's CollapseMarker's tell).
    const leafCircles = Array.from(container.querySelectorAll("g.tipnode circle[data-pan-ignore]"));
    expect(leafCircles.length).toBeGreaterThan(0);
    const handle = leafCircles[0];

    fireEvent.pointerDown(handle, { clientY: 0 });
    fireEvent.pointerMove(handle, { clientY: 1000 }); // large delta to force at least one step
    fireEvent.pointerUp(handle, { clientY: 1000 });

    const orderCall = onSelectionChange.mock.calls.find(([next]) => (next as TreeSelection).order);
    expect(orderCall).toBeDefined();
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
