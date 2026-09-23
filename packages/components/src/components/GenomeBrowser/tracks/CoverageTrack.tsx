import type { CoverageTrack as CoverageTrackData, TrackRenderProps } from "../types";

/**
 * Renders a `"coverage"` track as a filled area with a stroked outline. Colored from the accent
 * token at two opacities rather than hardcoded blues, so it follows the host theme.
 */
export function CoverageTrackRenderer({ track, scale, height }: TrackRenderProps<CoverageTrackData>) {
  const points = track.data;
  if (points.length === 0) return null;

  const maxValue = Math.max(...points.map((p) => p.value), 0) || 1;
  const toY = (value: number) => height - (value / maxValue) * height;
  const linePoints = points.map((p) => `${scale(p.position)},${toY(p.value)}`).join(" L");
  const areaPath = `M${scale(points[0].position)},${height} L${linePoints} L${scale(
    points[points.length - 1].position
  )},${height} Z`;

  return (
    <g style={{ color: "var(--rbv-accent)" }}>
      <path d={areaPath} fill="currentColor" fillOpacity={0.25} stroke="none" />
      <path d={`M${linePoints}`} fill="none" stroke="currentColor" strokeWidth={1} strokeOpacity={0.8} />
    </g>
  );
}
