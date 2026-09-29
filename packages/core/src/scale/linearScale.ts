/**
 * @public
 * A minimal linear scale: maps a numeric domain to a numeric range (and back)
 */
export interface LinearScale {
  (value: number): number;
  /** Inverse of the scale: maps a range value back to its domain value. */
  invert: (value: number) => number;
  domain: () => [number, number];
  range: () => [number, number];
}

/** @public */
export function createLinearScale(
  domain: [number, number],
  range: [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;

  const scale = ((value: number) => {
    if (d1 === d0) return r0;
    const t = (value - d0) / (d1 - d0);
    return r0 + t * (r1 - r0);
  }) as LinearScale;

  scale.invert = (value: number) => {
    if (r1 === r0) return d0;
    const t = (value - r0) / (r1 - r0);
    return d0 + t * (d1 - d0);
  };
  scale.domain = () => [d0, d1];
  scale.range = () => [r0, r1];

  return scale;
}
