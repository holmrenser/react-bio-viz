import type { BlastResult, Hsp } from "@react-bio-viz/core";
import { describe, expect, it } from "vitest";

import { blastHitsFromResult } from "./blastResult";

function hsp(num: number, queryFrom: number, queryTo: number): Hsp {
  return {
    num,
    bitScore: 200 - num,
    score: 500,
    evalue: 10 ** -(60 - num),
    identity: 90,
    alignLen: 120,
    queryFrom,
    queryTo,
    hitFrom: queryFrom + 5,
    hitTo: queryTo + 5,
    qseq: "",
    hseq: "",
    midline: "",
  };
}

function hit(accession: string, hsps: [Hsp, ...Hsp[]]): BlastResult["hits"][number] {
  const member = { accession, title: accession, taxid: 1, name: "species" };
  return {
    ...member,
    saccver: `${accession}.1`,
    members: [member],
    clusterSize: 1,
    queryCover: 90,
    percentIdentity: 75,
    num: 1,
    len: 130,
    hsps,
    ancestors: [1],
  };
}

const result: BlastResult = {
  program: "blastp",
  version: "BLAST 2.16.0+",
  db: "nr",
  queryId: "Query_1",
  queryLen: 300,
  queryTitle: "query",
  stat: "",
  message: "",
  hits: [hit("A", [hsp(1, 1, 120), hsp(2, 150, 270)]), hit("B", [hsp(1, 10, 130)])],
};

describe("blastHitsFromResult", () => {
  it("makes one row per HSP, in hit order", () => {
    expect(blastHitsFromResult(result).map((row) => row.id)).toEqual(["A-1", "A-2", "B-1"]);
  });

  it("maps HSP coordinates and scores", () => {
    expect(blastHitsFromResult(result)[1]).toEqual({
      id: "A-2",
      queryId: "Query_1",
      subjectId: "A",
      queryStart: 150,
      queryEnd: 270,
      subjectStart: 155,
      subjectEnd: 275,
      evalue: 1e-58,
      bitScore: 198,
      percentIdentity: 75,
    });
  });

  it("returns no rows for a result without hits", () => {
    expect(blastHitsFromResult({ ...result, hits: [] })).toEqual([]);
  });
});
