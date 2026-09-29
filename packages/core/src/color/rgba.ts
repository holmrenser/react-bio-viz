import Color from "color";

/** @public An 8-bit `[r, g, b, a]` quadruple, ready to write into `ImageData`. */
export type RGBA = readonly [number, number, number, number];

const OPAQUE_BLACK: RGBA = [0, 0, 0, 255];
const cache = new Map<string, RGBA>();

/**
 * @public
 * Resolves a CSS colour string (`#rrggbb`, `rgb()`, `hsl()`, a name) to 8-bit RGBA for `ImageData`,
 * memoised per string. An unparseable string gives opaque black rather than throwing.
 */
export function toRGBA(color: string): RGBA {
  const cached = cache.get(color);
  if (cached) return cached;
  let rgba: RGBA = OPAQUE_BLACK;
  try {
    const parsed = Color(color).rgb();
    const [r, g, b] = parsed.array();
    rgba = [Math.round(r), Math.round(g), Math.round(b), Math.round(parsed.alpha() * 255)];
  } catch {
    // keep the fallback
  }
  cache.set(color, rgba);
  return rgba;
}
