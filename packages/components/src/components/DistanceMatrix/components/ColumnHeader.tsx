/**
 * Column names, rotated 45° so long names fit above narrow cells. Only the visible columns are
 * rendered, so the header costs the same for any matrix size.
 */
export function ColumnHeader({
  names,
  x0,
  x1,
  cellWidth,
  width,
  height,
  hoverCol,
}: {
  /** Display-ordered column names. */
  names: readonly string[];
  x0: number;
  x1: number;
  cellWidth: number;
  width: number;
  height: number;
  hoverCol: number | null;
}) {
  const first = Math.max(0, Math.floor(x0));
  const last = Math.min(names.length, Math.ceil(x1));
  const fontSize = Math.max(6, Math.min(12, cellWidth * 0.6));
  const columns: number[] = [];
  for (let col = first; col < last; col += 1) columns.push(col);
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "hidden" }} className="text-foreground">
      {cellWidth >= 6 &&
        columns.map((col) => {
          const x = (col - x0 + 0.5) * cellWidth;
          return (
            <text
              key={col}
              transform={`translate(${x},${height - 4}) rotate(-45)`}
              fontSize={fontSize}
              fill="currentColor"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={hoverCol === col ? "bold" : undefined}
            >
              <title>{names[col]}</title>
              {names[col]}
            </text>
          );
        })}
    </svg>
  );
}
