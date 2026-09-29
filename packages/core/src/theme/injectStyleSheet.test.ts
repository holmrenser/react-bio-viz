import { afterEach, describe, expect, it } from "vitest";
import { injectStyleSheet } from "./injectStyleSheet";

afterEach(() => {
  document.head.innerHTML = "";
});

describe("injectStyleSheet", () => {
  it("prepends one style element to <head>", () => {
    const host = document.createElement("link");
    document.head.append(host);
    injectStyleSheet(".a{color:red}", "rbv-test");
    const style = document.getElementById("rbv-test");
    expect(style?.tagName).toBe("STYLE");
    expect(style?.textContent).toBe(".a{color:red}");
    expect(document.head.firstElementChild).toBe(style);
  });

  it("injects only once per id", () => {
    injectStyleSheet(".a{}", "rbv-test");
    injectStyleSheet(".b{}", "rbv-test");
    expect(document.head.querySelectorAll("#rbv-test")).toHaveLength(1);
    expect(document.getElementById("rbv-test")?.textContent).toBe(".a{}");
  });
});
