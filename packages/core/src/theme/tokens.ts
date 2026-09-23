/**
 * @public
 * The CSS custom property holding the visualization accent — the one saturated colour the library
 * reserves for "you can interact with this" (hover outlines, selection strokes, the MSA cursor
 * cross-hair). Defined for both themes in the shipped stylesheet, so SVG can use it directly and
 * follow light/dark for free.
 */
export const ACCENT_COLOR = "var(--rbv-accent)";

/** @public The same accent as a bare `r, g, b` triple, for `rgb(... / alpha)` composition. */
export const ACCENT_RGB = "var(--rbv-accent-rgb)";

/** @public The accent at a given opacity, e.g. `accentAlpha(0.15)` for a selection wash. */
export function accentAlpha(alpha: number): string {
  return `rgb(${ACCENT_RGB} / ${alpha})`;
}

/**
 * @public
 * Literal accent values, for canvas rendering — a `<canvas>` context can't resolve a CSS custom
 * property, so it needs the concrete colour for the current theme. SVG should use
 * {@link ACCENT_COLOR} instead and let CSS pick.
 */
export const ACCENT_LITERAL = { light: "rgb(48, 92, 222)", dark: "rgb(125, 163, 255)" } as const;
