/**
 * @public
 * Class on every component root and portalled overlay. The stylesheet scopes its element reset to
 * it, so it never restyles the host page.
 */
export const ROOT_CLASS = "rbv";

/**
 * @public
 * The accent: the one saturated colour, reserved for interactive affordances (hover outlines,
 * selection strokes, the MSA cursor). A CSS variable defined for both themes.
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
 * The accent as literal colours, for canvas (which can't resolve CSS variables). SVG uses
 * {@link ACCENT_COLOR}.
 */
export const ACCENT_LITERAL = { light: "rgb(48, 92, 222)", dark: "rgb(125, 163, 255)" } as const;

/**
 * @public
 * Selected rows, columns and cells: red rather than the accent, so a selection stays distinct from
 * hover feedback. Literal, for canvas; it reads on light and dark backgrounds alike.
 */
export const SELECTION_LITERAL = { fill: "rgba(220, 60, 60, 0.18)", stroke: "rgba(220, 60, 60, 0.8)" } as const;
