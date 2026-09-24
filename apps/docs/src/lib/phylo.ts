import type { AlignedSequences, Tree } from "react-bio-viz";

/**
 * Example analysis for the docs — not part of the library, which only visualises. A real app would
 * use a proper tool (acacia runs nj.rs in a worker); these keep the examples self-contained.
 */

/** p-distance: the share of differing positions among those where neither sequence has a gap. */
export function pDistances(msa: AlignedSequences): number[][] {
  return msa.map((a) =>
    msa.map((b) => {
      let compared = 0;
      let differing = 0;
      for (let i = 0; i < a.sequence.length; i += 1) {
        if (a.sequence[i] === "-" || b.sequence[i] === "-") continue;
        compared += 1;
        if (a.sequence[i] !== b.sequence[i]) differing += 1;
      }
      return compared > 0 ? differing / compared : 0;
    })
  );
}

/**
 * Neighbour-joining (Saitou & Nei 1987). Returns the unrooted tree hung from a trifurcating root,
 * as NJ programs conventionally report it; negative branch lengths are clamped to zero.
 */
export function neighborJoining(labels: string[], distances: number[][]): Tree {
  let nodes: Tree[] = labels.map((name) => ({ name, length: 0, children: [] }));
  let d = distances.map((row) => [...row]);

  while (nodes.length > 3) {
    const n = nodes.length;
    const r = d.map((row) => row.reduce((sum, value) => sum + value, 0));
    let best = { i: 0, j: 1, q: Number.POSITIVE_INFINITY };
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const q = (n - 2) * d[i][j] - r[i] - r[j];
        if (q < best.q) best = { i, j, q };
      }
    }
    const { i, j } = best;
    const li = d[i][j] / 2 + (r[i] - r[j]) / (2 * (n - 2));
    const lj = d[i][j] - li;
    const joined: Tree = {
      name: "",
      length: 0,
      children: [
        { ...nodes[i], length: Math.max(0, li) },
        { ...nodes[j], length: Math.max(0, lj) },
      ],
    };
    const keep = nodes.map((_, k) => k).filter((k) => k !== i && k !== j);
    const toJoined = keep.map((k) => (d[i][k] + d[j][k] - d[i][j]) / 2);
    d = [...keep.map((a, row) => [...keep.map((b) => d[a][b]), toJoined[row]]), [...toJoined, 0]];
    nodes = [...keep.map((k) => nodes[k]), joined];
  }

  if (nodes.length < 3) return { name: "", length: 0, children: nodes };
  const [a, b, c] = [0, 1, 2];
  const lengths = [
    (d[a][b] + d[a][c] - d[b][c]) / 2,
    (d[a][b] + d[b][c] - d[a][c]) / 2,
    (d[a][c] + d[b][c] - d[a][b]) / 2,
  ];
  return { name: "", length: 0, children: nodes.map((node, k) => ({ ...node, length: Math.max(0, lengths[k]) })) };
}
