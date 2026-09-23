import { cx, css } from "@emotion/css";

import { LABEL_FONT_SIZE } from "../constants";
import type { AlignedSequences } from "../types";

/**
 * Sequence-name gutter, clipped to and scrolled with the vertical viewport window (`y0`) so it
 * stays in sync with the panned/zoomed alignment instead of always showing every row.
 */
export function MSALabels({
  msa,
  width,
  height,
  cellSize,
  y0,
}: {
  msa: AlignedSequences;
  width: number;
  height: number;
  cellSize: number;
  y0: number;
}) {
  return (
    <div className={css({ width, height, overflow: "hidden", flexShrink: 0 })}>
      <ul
        className={css({
          margin: 0,
          padding: 0,
          paddingRight: ".5em",
          fontFamily: "sans-serif",
          transform: `translateY(${-y0 * cellSize}px)`,
        })}
      >
        {msa.map(({ header }) => (
          <li
            key={header}
            className={css({
              overflow: "hidden",
              height: cellSize,
              lineHeight: `${cellSize}px`,
              fontSize: LABEL_FONT_SIZE,
              whiteSpace: "nowrap",
              "&:hover": { overflow: "visible" },
            })}
          >
            <span
              className={cx(
                "bg-background",
                css({
                  display: "inline-block",
                  paddingRight: ".25em",
                  fontWeight: header === "Consensus" ? 800 : 500,
                })
              )}
            >
              {header}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
