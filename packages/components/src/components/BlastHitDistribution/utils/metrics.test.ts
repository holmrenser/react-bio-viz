import { describe, expect, it } from "vitest";

import { formatMetricValue, metricLabel, metricScore, metricValue } from "./metrics";
import type { BlastHit } from "../types";

const hit: BlastHit = {
  id: "h1",
  queryId: "q1",
  subjectId: "s1",
  queryStart: 10,
  queryEnd: 100,
  evalue: 1e-20,
  bitScore: 250,
  percentIdentity: 98.5,
};

describe("metricValue", () => {
  it("reads the raw value for each metric", () => {
    expect(metricValue(hit, "evalue")).toBe(1e-20);
    expect(metricValue(hit, "bitScore")).toBe(250);
    expect(metricValue(hit, "percentIdentity")).toBe(98.5);
  });
});

describe("metricScore", () => {
  it("passes bitScore and percentIdentity through unchanged (already higher-is-better)", () => {
    expect(metricScore(hit, "bitScore")).toBe(250);
    expect(metricScore(hit, "percentIdentity")).toBe(98.5);
  });

  it("negates log10 of evalue so lower evalue produces a higher score", () => {
    const strongerHit: BlastHit = { ...hit, evalue: 1e-50 };
    const weakerHit: BlastHit = { ...hit, evalue: 1e-5 };
    expect(metricScore(strongerHit, "evalue")).toBeGreaterThan(metricScore(weakerHit, "evalue"));
  });

  it("does not produce Infinity for an evalue of exactly 0", () => {
    const perfectHit: BlastHit = { ...hit, evalue: 0 };
    expect(Number.isFinite(metricScore(perfectHit, "evalue"))).toBe(true);
  });
});

describe("metricLabel", () => {
  it("returns a human-readable label for each metric", () => {
    expect(metricLabel("evalue")).toBe("E-value");
    expect(metricLabel("bitScore")).toBe("Bit score");
    expect(metricLabel("percentIdentity")).toBe("% Identity");
  });
});

describe("formatMetricValue", () => {
  it("formats evalue in exponential notation", () => {
    expect(formatMetricValue(hit, "evalue")).toBe("1.00e-20");
  });

  it("formats bitScore to one decimal", () => {
    expect(formatMetricValue(hit, "bitScore")).toBe("250.0");
  });

  it("formats percentIdentity with a percent sign", () => {
    expect(formatMetricValue(hit, "percentIdentity")).toBe("98.5%");
  });
});
