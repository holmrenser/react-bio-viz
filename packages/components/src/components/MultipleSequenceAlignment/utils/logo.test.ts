import { describe, expect, it } from "vitest";

import { logoColumn } from "./logo";

const stat = (counts: Record<string, number>) => ({ dominantChar: "A", score: 1, identity: 1, counts });

describe("logoColumn", () => {
  it("gives a fully conserved column the full height", () => {
    expect(logoColumn(stat({ A: 10 }), 4)).toEqual([{ char: "A", height: 1 }]);
  });

  it("gives a uniform column no height", () => {
    const letters = logoColumn(stat({ A: 1, C: 1, G: 1, T: 1 }), 4);
    expect(letters.every((letter) => letter.height === 0)).toBe(true);
  });

  it("orders letters least frequent first and splits height by frequency", () => {
    const letters = logoColumn(stat({ A: 3, C: 1 }), 4);
    expect(letters.map((l) => l.char)).toEqual(["C", "A"]);
    expect(letters[1].height / letters[0].height).toBeCloseTo(3);
  });

  it("handles an all-gap column", () => {
    expect(logoColumn(stat({}), 20)).toEqual([]);
    expect(logoColumn(undefined, 20)).toEqual([]);
  });
});
