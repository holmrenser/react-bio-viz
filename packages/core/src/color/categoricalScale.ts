import Color from "color";
import randomColor from "randomcolor";

/** @public A base/contrast color pair for one category, derived deterministically from its name. */
export interface CategoricalColor {
  /** The category's primary color. */
  base: string;
  /** A readable-contrast variant of `base` (darker+saturated on light bases, lighter+desaturated on dark ones). */
  contrast: string;
}

/** @public */
export interface CategoricalColorScaleOptions {
  /** Namespaces the scale, so two scales colour the same category name differently. */
  seed?: string;
}

/** @public */
export type CategoricalColorScale = (category: string) => CategoricalColor;

/**
 * @public
 * Deterministic categorical colours: the same category string always maps to the same colour pair,
 * across renders and reloads. Use it for any per-category colour (feature ids, taxon names, leaves).
 */
export function createCategoricalColorScale(
  options: CategoricalColorScaleOptions = {}
): CategoricalColorScale {
  const { seed } = options;
  return (category: string) => {
    const base = Color(randomColor({ seed: seed ? `${seed}:${category}` : category }));
    const contrast = base.isLight() ? base.darken(0.5).saturate(0.3) : base.lighten(0.5).desaturate(0.3);
    return { base: base.toString(), contrast: contrast.toString() };
  };
}
