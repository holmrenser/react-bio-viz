import { pickNiceLength } from "@react-bio-viz/core";

import { SCALE_BAR_TARGET_PIXELS } from "../constants";

/** A branch-length legend: an I-beam of a round length, about `targetPixels` wide. */
export function ScaleBar({
  scalingFactor,
  targetPixels = SCALE_BAR_TARGET_PIXELS,
  x,
  y,
}: {
  /** Pixels per branch-length-unit, from the layout function. */
  scalingFactor: number;
  /** About how wide the bar should be, in pixels. */
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
      className="scale-bar"
      style={{ fontFamily: "sans-serif" }}
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
