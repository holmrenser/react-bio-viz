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
 * A continuous color scale for a numeric metric (e.g. BLAST e-value/bit score/percent identity),
 * as opposed to {@link createCategoricalColorScale}'s discrete category→color mapping. Linearly
 * interpolates through RGB space between `range`'s two colors; values outside `domain` are
 * clamped to the nearest end rather than extrapolated.
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
