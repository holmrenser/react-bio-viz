import { describe, expect, it } from "vitest";

import { matchesQuery } from "./search";

describe("matchesQuery", () => {
  it("matches everything when the query is empty", () => {
    expect(matchesQuery("Homo sapiens", "", false)).toBe(true);
  });

  it("matches a case-insensitive substring", () => {
    expect(matchesQuery("Homo sapiens", "SAPIENS", false)).toBe(true);
    expect(matchesQuery("Homo sapiens", "neanderthal", false)).toBe(false);
  });

  it("matches a regular expression", () => {
    expect(matchesQuery("Homo sapiens", "^Homo", true)).toBe(true);
    expect(matchesQuery("Pan troglodytes", "^Homo", true)).toBe(false);
  });

  it("treats an invalid regex as no match instead of throwing", () => {
    expect(() => matchesQuery("Homo sapiens", "(unterminated", true)).not.toThrow();
    expect(matchesQuery("Homo sapiens", "(unterminated", true)).toBe(false);
  });
});
