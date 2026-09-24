/**
 * Every cell's fill, resolved once into a compact matrix of palette indices. Rendering then only
 * does array lookups — per visible cell when zoomed in, per *pixel* when zoomed out — instead of
 * re-running colour-scheme logic on every pan/zoom frame, and it never needs a bitmap of the whole
 * alignment (which is what made large alignments exceed the browser's canvas size limit).
 */
export interface ColorIndex {
  rows: number;
  cols: number;
  /** Palette index of cell `(row, col)` at `row * cols + col`, rows in `msa` order. */
  indices: Uint16Array;
  /** CSS colours, indexed by the values in `indices`. */
  palette: string[];
}

/** Largest palette a `Uint16Array` can index. Score styles quantise to stay far below this. */
const MAX_PALETTE = 0xffff;

export function buildColorIndex(
  sequences: readonly string[],
  colorAt: (char: string, row: number, col: number) => string
): ColorIndex {
  const rows = sequences.length;
  const cols = sequences[0]?.length ?? 0;
  const indices = new Uint16Array(rows * cols);
  const palette: string[] = [];
  const lookup = new Map<string, number>();

  for (let row = 0; row < rows; row += 1) {
    const sequence = sequences[row];
    const offset = row * cols;
    for (let col = 0; col < cols; col += 1) {
      const color = colorAt(sequence[col] ?? "-", row, col);
      let index = lookup.get(color);
      if (index === undefined) {
        index = Math.min(palette.length, MAX_PALETTE);
        if (palette.length < MAX_PALETTE) {
          palette.push(color);
          lookup.set(color, index);
        }
      }
      indices[offset + col] = index;
    }
  }
  return { rows, cols, indices, palette };
}
