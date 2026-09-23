import { describe, expect, it } from "vitest";

import { createSequentialColorScale } from "./sequentialScale";

describe("createSequentialColorScale", () => {
  it("maps the domain minimum to the first range color", () => {
    const scale = createSequentialColorScale({ domain: [0, 10], range: ["#000000", "#ffffff"] });
    expect(scale(0)).toBe("rgb(0, 0, 0)");
  });

  it("maps the domain maximum to the second range color", () => {
    const scale = createSequentialColorScale({ domain: [0, 10], range: ["#000000", "#ffffff"] });
    expect(scale(10)).toBe("rgb(255, 255, 255)");
  });

  it("interpolates the midpoint", () => {
    const scale = createSequentialColorScale({ domain: [0, 10], range: ["#000000", "#ffffff"] });
    expect(scale(5)).toBe("rgb(128, 128, 128)");
  });

  it("clamps values below the domain to the first color", () => {
    const scale = createSequentialColorScale({ domain: [0, 10], range: ["#000000", "#ffffff"] });
    expect(scale(-5)).toBe("rgb(0, 0, 0)");
  });

  it("clamps values above the domain to the second color", () => {
    const scale = createSequentialColorScale({ domain: [0, 10], range: ["#000000", "#ffffff"] });
    expect(scale(50)).toBe("rgb(255, 255, 255)");
  });

  it("does not divide by zero when the domain is a single point", () => {
    const scale = createSequentialColorScale({ domain: [5, 5], range: ["#000000", "#ffffff"] });
    expect(scale(5)).toBe("rgb(0, 0, 0)");
  });

  it("uses the default blue ramp when range is omitted", () => {
    const scale = createSequentialColorScale({ domain: [0, 1] });
    expect(scale(0)).toMatch(/^rgb\(/);
    expect(scale(1)).toMatch(/^rgb\(/);
    expect(scale(0)).not.toBe(scale(1));
  });
});
