import { describe, expect, it } from "vitest";

import { serializeSvg } from "./serializeSvg";

function svgFixture(): SVGSVGElement {
  document.body.innerHTML = `
    <style>.branch { stroke: rgb(1, 2, 3); }</style>
    <svg width="100" height="50" viewBox="10 10 20 20" class="x">
      <path class="branch" d="M0,0 L10,10" />
      <path stroke="transparent" d="M0,0 L10,10" />
    </svg>`;
  return document.querySelector("svg")!;
}

describe("serializeSvg", () => {
  it("inlines computed styles and drops class names", () => {
    const text = serializeSvg(svgFixture(), { fitToContent: false });
    expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(text).toContain("stroke: rgb(1, 2, 3)");
    expect(text).not.toContain('class="branch"');
  });

  it("drops invisible hit areas", () => {
    const text = serializeSvg(svgFixture(), { fitToContent: false });
    expect(text.match(/<path/g)).toHaveLength(1);
  });

  it("can paint a background", () => {
    const text = serializeSvg(svgFixture(), { fitToContent: false, background: "white" });
    expect(text).toMatch(/<rect[^>]*fill="white"/);
  });
});
