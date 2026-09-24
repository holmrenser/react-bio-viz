import { describe, expect, it } from "vitest";

import { buildColorIndex } from "./colorIndex";

describe("buildColorIndex", () => {
  it("stores one palette entry per distinct colour, row-major", () => {
    const index = buildColorIndex(["AAC", "CAA"], (char) => (char === "A" ? "red" : "blue"));
    expect(index.rows).toBe(2);
    expect(index.cols).toBe(3);
    expect(index.palette).toEqual(["red", "blue"]);
    expect(Array.from(index.indices)).toEqual([0, 0, 1, 1, 0, 0]);
  });

  it("passes the row and column to the colour function", () => {
    const index = buildColorIndex(["AB", "CD"], (_char, row, col) => `${row}-${col}`);
    expect(index.palette).toEqual(["0-0", "0-1", "1-0", "1-1"]);
  });
});
