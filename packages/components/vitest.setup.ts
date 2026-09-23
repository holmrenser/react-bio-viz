import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement scrollIntoView; Radix UI's Select (and other listbox-style primitives)
// call it when the open list scrolls its selected item into view.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
