import type { AlignedSequences, Sequence } from ".";

export function getConsensus(msa: AlignedSequences): Sequence {
  const transposedMsa = msa[0].sequence
    .split("")
    .map((_, colIndex) => msa.map(({ sequence }) => sequence.charAt(colIndex)));
  const consensusSequence = transposedMsa
    .map((seq: string[]) => {
      const countMap: Map<string, number> = new Map();
      let max = seq[0];
      let maxCount = 1;
      seq.forEach((s: string) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const sCount = countMap.has(s) ? countMap.get(s)! + 1 : 1;
        countMap.set(s, sCount);
        if (sCount > maxCount) {
          max = s;
          maxCount = sCount;
        }
      });
      return max;
    })
    .join("");
  return { header: "Consensus", sequence: consensusSequence };
}
