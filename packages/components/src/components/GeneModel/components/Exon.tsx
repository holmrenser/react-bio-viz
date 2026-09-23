import { ACCENT_COLOR, Popover, PopoverBody, PopoverTrigger, type LinearScale } from "@react-bio-viz/core";
import { css } from "@emotion/css";

import { EXON_HEIGHT } from "../constants";
import type { SequenceInterval } from "../types";

const UTR_HEIGHT = 4;

const HOVER_CSS_CLASS = css({
  cursor: "pointer",
  strokeWidth: "1.5px",
  "&:hover": {
    strokeWidth: "3px",
    stroke: ACCENT_COLOR,
  },
});

/** One exon/CDS feature, rendered as a clickable rect with a popover of its gff3 fields. */
export function Exon({
  interval,
  baseColor,
  contrastColor,
  scale,
  exonPopoverFn,
}: {
  interval: SequenceInterval;
  /** Fill used for CDS features. */
  baseColor: string;
  /** Fill used for non-CDS features (e.g. UTRs). */
  contrastColor: string;
  /** Scale transforming genome coordinates to plot coordinates. */
  scale: LinearScale;
  exonPopoverFn: (arg0: SequenceInterval) => JSX.Element;
}) {
  const { start, end, interval_type, ID } = interval;

  const isCoding = interval_type === "CDS";
  const fill = isCoding ? baseColor : contrastColor;
  const height = isCoding ? EXON_HEIGHT : UTR_HEIGHT;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <rect
          x={scale(start)}
          width={scale(end) - scale(start)}
          y={-height / 2}
          height={height}
          fill={fill}
          className={HOVER_CSS_CLASS}
          data-pan-ignore
        />
      </PopoverTrigger>
      <PopoverBody header={ID}>{exonPopoverFn(interval)}</PopoverBody>
    </Popover>
  );
}
