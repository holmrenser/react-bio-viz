import { describe, expect, it } from "vitest";

import { toRGBA } from "./rgba";
import { qualityGradient } from "./schemes";

describe("toRGBA", () => {
  it("parses the colour formats the library's colour functions produce", () => {
    expect(toRGBA("#ff8000")).toEqual([255, 128, 0, 255]);
    expect(toRGBA("royalblue")).toEqual([65, 105, 225, 255]);
    expect(toRGBA("rgb(1, 2, 3)")).toEqual([1, 2, 3, 255]);
    const [, , , alpha] = toRGBA(qualityGradient(0.5));
    expect(alpha).toBe(255);
  });

  it("falls back to opaque black instead of throwing on garbage", () => {
    expect(toRGBA("not a colour")).toEqual([0, 0, 0, 255]);
  });
});
