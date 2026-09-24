import { describe, expect, it } from "vitest";

import { applySelectionMode, indexRange, pruneSelection, selectionModeFor } from "./selection";

describe("selection utils", () => {
  it("maps modifier keys to a mode", () => {
    expect(selectionModeFor({ shiftKey: false, metaKey: false, ctrlKey: false })).toBe("replace");
    expect(selectionModeFor({ shiftKey: true, metaKey: false, ctrlKey: false })).toBe("additive");
    expect(selectionModeFor({ shiftKey: false, metaKey: true, ctrlKey: false })).toBe("toggle");
    expect(selectionModeFor({ shiftKey: false, metaKey: false, ctrlKey: true })).toBe("toggle");
  });

  it("replaces, adds and toggles", () => {
    expect(applySelectionMode([1, 2], [3, 3], "replace")).toEqual([3]);
    expect(applySelectionMode([1, 2], [2, 3], "additive")).toEqual([1, 2, 3]);
    expect(applySelectionMode([1, 2], [2, 3], "toggle")).toEqual([1, 3]);
  });

  it("builds an inclusive range in either direction", () => {
    expect(indexRange(3, 1)).toEqual([1, 2, 3]);
    expect(indexRange(2, 2)).toEqual([2]);
  });

  it("prunes rows and columns that no longer exist, keeping identity when nothing changed", () => {
    const selection = { rows: ["a", "gone"], columns: [0, 9] };
    expect(pruneSelection(selection, new Set(["a"]), 5)).toEqual({ rows: ["a"], columns: [0] });
    const clean = { rows: ["a"], columns: [0] };
    expect(pruneSelection(clean, new Set(["a"]), 5)).toBe(clean);
  });
});
