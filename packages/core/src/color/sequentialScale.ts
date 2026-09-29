import Color from "color";

/** @public */
export interface SequentialColorScaleOptions {
  /** The numeric domain `[min, max]` mapped onto `range`. Values outside are clamped. */
  domain: [number, number];
  /** Colors at the low and high ends of `domain`. @defaultValue a light-to-dark blue ramp */
  range?: [string, string];
}

/** @public */
export type SequentialColorScale = (value: number) => string;

/**
 * @public
 * A continuous colour scale for a numeric metric: interpolates between `range`'s two colours, and
 * clamps values outside `domain` to its ends.
 */
export function createSequentialColorScale(options: SequentialColorScaleOptions): SequentialColorScale {
  const { domain, range = ["#deebf7", "#08306b"] } = options;
  const [d0, d1] = domain;
  const start = Color(range[0]);
  const end = Color(range[1]);

  return (value: number) => {
    const t = d1 === d0 ? 0 : Math.min(1, Math.max(0, (value - d0) / (d1 - d0)));
    return start.mix(end, t).toString();
  };
}
