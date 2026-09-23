/** A point in SVG pixel space. */
export interface Point {
  x: number;
  y: number;
}

/** Polar → cartesian, around the centre `(cx, cy)`. Angles are in radians, 0 pointing right. */
export function toCartesian(radius: number, angle: number, cx: number, cy: number): Point {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/**
 * SVG path for the arc a radial layout draws between two sibling branches — the circular
 * equivalent of the vertical connector line a rectangular layout uses.
 */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = toCartesian(radius, startAngle, cx, cy);
  const end = toCartesian(radius, endAngle, cx, cy);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  const sweep = endAngle >= startAngle ? 1 : 0;
  return `M ${start.x},${start.y} A ${radius},${radius} 0 ${largeArc},${sweep} ${end.x},${end.y}`;
}

/** Truncates a long label to `max` characters, with an ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
