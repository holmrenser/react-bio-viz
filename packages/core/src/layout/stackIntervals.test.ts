import { describe, expect, it } from "vitest";

import { countIntervalRows, stackIntervals } from "./stackIntervals";

function interval(id: string, start: number, end: number) {
  return { id, start, end };
}

describe("stackIntervals", () => {
  it("puts non-overlapping intervals on the same row", () => {
    const intervals = [interval("a", 0, 10), interval("b", 20, 30), interval("c", 40, 50)];
    const rows = stackIntervals(intervals);
    expect(rows.get("a")).toBe(0);
    expect(rows.get("b")).toBe(0);
    expect(rows.get("c")).toBe(0);
  });

  it("puts overlapping intervals on different rows", () => {
    const intervals = [interval("a", 0, 20), interval("b", 10, 30)];
    const rows = stackIntervals(intervals);
    expect(rows.get("a")).not.toBe(rows.get("b"));
  });

  it("reuses a row once it frees up", () => {
    const intervals = [interval("a", 0, 10), interval("b", 5, 15), interval("c", 20, 30)];
    const rows = stackIntervals(intervals);
    expect(rows.get("a")).not.toBe(rows.get("b")); // a and b overlap
    expect(rows.get("c")).toBe(rows.get("a")); // c starts after a ends, reuses a's row
  });

  it("handles an interval exactly abutting another (end === start) as non-overlapping", () => {
    const intervals = [interval("a", 0, 10), interval("b", 10, 20)];
    const rows = stackIntervals(intervals);
    expect(rows.get("a")).toBe(rows.get("b"));
  });

  it("is order-independent (sorts by start internally)", () => {
    const forward = stackIntervals([interval("a", 0, 10), interval("b", 20, 30)]);
    const backward = stackIntervals([interval("b", 20, 30), interval("a", 0, 10)]);
    expect(forward.get("a")).toBe(backward.get("a"));
    expect(forward.get("b")).toBe(backward.get("b"));
  });
});

describe("countIntervalRows", () => {
  it("returns 0 for an empty list", () => {
    expect(countIntervalRows([])).toBe(0);
  });

  it("returns 1 when nothing overlaps", () => {
    expect(countIntervalRows([interval("a", 0, 10), interval("b", 20, 30)])).toBe(1);
  });

  it("returns the max simultaneous overlap depth", () => {
    const intervals = [interval("a", 0, 30), interval("b", 5, 15), interval("c", 10, 20)];
    expect(countIntervalRows(intervals)).toBe(3);
  });
});
