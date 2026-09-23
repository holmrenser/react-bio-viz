import { describe, expect, it } from "vitest";

import { computeHighlightMask } from "./highlight";

describe("computeHighlightMask", () => {
  it("returns all-false when pattern is empty", () => {
    expect(computeHighlightMask("ACDEFG", "", false)).toEqual([false, false, false, false, false, false]);
  });

  it("matches a plain substring case-insensitively", () => {
    expect(computeHighlightMask("ACDEFG", "cde", false)).toEqual([false, true, true, true, false, false]);
  });

  it("matches every occurrence of a repeated substring", () => {
    expect(computeHighlightMask("ACAC", "AC", false)).toEqual([true, true, true, true]);
  });

  it("matches a regular expression", () => {
    expect(computeHighlightMask("ACDEFG", "[DE]+", true)).toEqual([false, false, true, true, false, false]);
  });

  it("treats an invalid regex as no match instead of throwing", () => {
    expect(() => computeHighlightMask("ACDEFG", "(unterminated", true)).not.toThrow();
    expect(computeHighlightMask("ACDEFG", "(unterminated", true)).toEqual([false, false, false, false, false, false]);
  });
});
