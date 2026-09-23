import { ACCENT_COLOR, type LinearScale } from "@react-bio-viz/core";
import { css } from "@emotion/css";

import { TRANSCRIPT_HEIGHT } from "../constants";
import type { SequenceInterval } from "../types";

const HOVER_CSS_CLASS = css({
  cursor: "pointer",
  strokeWidth: "1.5px",
  "&:hover": {
    strokeWidth: "3px",
    stroke: ACCENT_COLOR,
  },
});

type ReactChildren = JSX.Element[] | JSX.Element;

/** One mRNA/transcript: an arrow-terminated backbone line with its exon/CDS children rendered on top. */
export function Transcript({
  transcript,
  scale,
  index,
  children,
}: {
  transcript: SequenceInterval;
  children: ReactChildren;
  scale: LinearScale;
  index: number;
}): JSX.Element {
  const { start, end } = transcript;
  return (
    <g className="transcript" transform={`translate(0,${index * TRANSCRIPT_HEIGHT})`}>
      <line
        x1={scale(start)}
        x2={scale(end)}
        y1={0}
        y2={0}
        stroke="currentColor"
        markerEnd="url(#arrowEnd)"
        className={HOVER_CSS_CLASS}
      />
      {children}
    </g>
  );
}
