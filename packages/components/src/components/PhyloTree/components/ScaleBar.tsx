import { pickNiceLength } from "@react-bio-viz/core";
import { css, cx } from "@emotion/css";

import { SCALE_BAR_TARGET_PIXELS } from "../constants";

/**
 * A branch-length legend: a labeled I-beam sized to a "nice" round distance, roughly
 * `targetPixels` wide. Only meaningful when branch length actually drives the layout
 * (`"rectangular"` and `"radial"`); `"cladogram"` reports no scaling factor, so none is drawn.
 */
export function ScaleBar({
  scalingFactor,
  targetPixels = SCALE_BAR_TARGET_PIXELS,
  x,
  y,
}: {
  /** Pixels per branch-length-unit, from the layout function. */
  scalingFactor: number;
  /** Roughly how wide the bar should be, in pixels; the nearest nice round length is used instead of this exact value. */
  targetPixels?: number;
  x: number;
  y: number;
}) {
  if (!(scalingFactor > 0)) return null;
  const length = pickNiceLength(targetPixels / scalingFactor);
  if (length <= 0) return null;
  const pixelLength = length * scalingFactor;

  return (
    <g
      className={cx("scale-bar", css({ fontFamily: "sans-serif" }))}
      transform={`translate(${x},${y})`}
      stroke="currentColor"
      fill="currentColor"
      opacity={0.75}
    >
      <line x1={0} x2={pixelLength} y1={0} y2={0} strokeWidth={1} />
      <line x1={0} x2={0} y1={-4} y2={4} strokeWidth={1} />
      <line x1={pixelLength} x2={pixelLength} y1={-4} y2={4} strokeWidth={1} />
      <text x={pixelLength / 2} y={16} textAnchor="middle" fontSize={10} stroke="none">
        {length}
      </text>
    </g>
  );
}
