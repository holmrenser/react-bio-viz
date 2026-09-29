import { describe, expect, it } from "vitest";

import { EMPTY_SELECTION, toggleHit } from "./selection";

describe("toggleHit", () => {
  it("adds an unselected hit and removes a selected one", () => {
    const selected = toggleHit(EMPTY_SELECTION, "h1");
    expect(selected).toEqual({ selectedHitIds: ["h1"] });
    expect(toggleHit(toggleHit(selected, "h2"), "h1")).toEqual({ selectedHitIds: ["h2"] });
  });

  it("never mutates the given selection", () => {
    toggleHit(EMPTY_SELECTION, "h1");
    expect(EMPTY_SELECTION).toEqual({ selectedHitIds: [] });
  });
});
