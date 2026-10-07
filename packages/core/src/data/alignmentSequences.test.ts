import { describe, expect, it } from "vitest";

import { alignmentSequences, type Sequence } from ".";

const rows: [Sequence, ...Sequence[]] = [
  { identifier: "seq1", sequence: "AC-T" },
  { identifier: "seq2", sequence: "ACGT" },
];

describe("alignmentSequences", () => {
  it("returns a bare-array alignment as is", () => {
    expect(alignmentSequences(rows)).toBe(rows);
  });

  it("unwraps a wrapped alignment", () => {
    expect(alignmentSequences({ type: "alignment", sequences: rows })).toBe(rows);
  });
});
