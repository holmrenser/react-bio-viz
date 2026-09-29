import { ACCENT_COLOR } from "@react-bio-viz/core";

import type { CoverageTrack as CoverageTrackData, TrackRenderProps } from "../types";

/** Renders a `"coverage"` track as a filled area chart in the accent colour. */
export function CoverageTrackRenderer({ track, scale, height }: TrackRenderProps<CoverageTrackData>) {
  const points = track.data;
  if (points.length === 0) return null;

  // A loop, not `Math.max(...values)`, which overflows the stack on long profiles.
  const maxValue = points.reduce((max, point) => Math.max(max, point.value), 0) || 1;
  const toY = (value: number) => height - (value / maxValue) * height;
  const linePoints = points.map((p) => `${scale(p.position)},${toY(p.value)}`).join(" L");
  const first = scale(points[0].position);
  const last = scale(points[points.length - 1].position);

  return (
    <g style={{ color: ACCENT_COLOR }}>
      <path d={`M${first},${height} L${linePoints} L${last},${height} Z`} fill="currentColor" fillOpacity={0.25} />
      <path d={`M${linePoints}`} fill="none" stroke="currentColor" strokeWidth={1} strokeOpacity={0.8} />
    </g>
  );
}
