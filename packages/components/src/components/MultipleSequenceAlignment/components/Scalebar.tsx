import { computeColumnTicks } from "@react-bio-viz/core";

import { SCALEBAR_HEIGHT } from "../constants";

const MAJOR_TICK = 7;
const MINOR_TICK = 4;

/** The column ruler above the alignment, following its pan/zoom; a caret marks the hovered column. */
export function Scalebar({
  width,
  columnCount,
  x0,
  pixelsPerColumn,
  hoverCol,
}: {
  width: number;
  columnCount: number;
  /** Leftmost visible column (fractional), from the viewport. */
  x0: number;
  pixelsPerColumn: number;
  hoverCol?: number | null;
}): React.JSX.Element {
  // The viewport is expressed in columns; the tick maths wants a pixel offset for column 0.
  const offsetX = -x0 * pixelsPerColumn;
  const ticks = computeColumnTicks({ columnCount, width, offsetX, pixelsPerColumn });
  const hoverX =
    hoverCol === null || hoverCol === undefined
      ? null
      : hoverCol * pixelsPerColumn + pixelsPerColumn / 2 + offsetX;

  return (
    <svg
      width={width}
      height={SCALEBAR_HEIGHT}
      className="text-muted-foreground"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Baseline the ticks hang from */}
      <line
        x1={0}
        y1={SCALEBAR_HEIGHT - 0.5}
        x2={width}
        y2={SCALEBAR_HEIGHT - 0.5}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.35}
      />
      {ticks.map((tick) => {
        const isMajor = tick.label !== null;
        return (
          <g key={tick.value}>
            <line
              x1={tick.x}
              y1={SCALEBAR_HEIGHT - (isMajor ? MAJOR_TICK : MINOR_TICK)}
              x2={tick.x}
              y2={SCALEBAR_HEIGHT}
              stroke="currentColor"
              strokeWidth={1}
              opacity={isMajor ? 0.6 : 0.3}
            />
            {isMajor && (
              <text
                x={tick.x}
                y={SCALEBAR_HEIGHT - MAJOR_TICK - 3}
                textAnchor="middle"
                fill="currentColor"
                opacity={0.7}
                style={{ fontSize: 9, fontFamily: "ui-monospace, monospace" }}
              >
                {tick.label}
              </text>
            )}
          </g>
        );
      })}
      {hoverX !== null && hoverX >= 0 && hoverX <= width && (
        <polygon
          points={`${hoverX - 4},${SCALEBAR_HEIGHT} ${hoverX + 4},${SCALEBAR_HEIGHT} ${hoverX},${SCALEBAR_HEIGHT - 5}`}
          fill="var(--rbv-accent)"
        />
      )}
    </svg>
  );
}
