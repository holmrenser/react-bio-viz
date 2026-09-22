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
  /** Distinguishes independent scales that would otherwise collide on the same category names (e.g. two different taxonomies both containing "Homo sapiens"). Omit for a fixed, still-deterministic default. */
  seed?: string;
}

/** @public */
export type CategoricalColorScale = (category: string) => CategoricalColor;

/**
 * @public
 * Deterministic, seeded categorical color assignment: the same category string always maps to
 * the same color pair, both within a render and across reloads. Shared by every component that
 * needs to color arbitrary category strings (amino acids, exon/transcript ids, taxon names, BLAST
 * subject ids) — replaces what used to be two independent `randomColor()`+`Color()` call sites
 * (GeneModel and PhyloTree) with subtly different contrast logic.
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
