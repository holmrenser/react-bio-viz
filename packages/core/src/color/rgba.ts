import Color from "color";

/** @public An 8-bit `[r, g, b, a]` quadruple, ready to write into `ImageData`. */
export type RGBA = readonly [number, number, number, number];

const OPAQUE_BLACK: RGBA = [0, 0, 0, 255];
const cache = new Map<string, RGBA>();

/**
 * @public
 * Resolves any CSS colour string the library's colour functions produce (`#rrggbb`, `rgb()`,
 * `hsl()`, named colours like `royalblue`) to 8-bit RGBA, memoised per string. Pixel-level canvas
 * rendering (the MSA's zoomed-out view and minimap, the distance heatmap) writes `ImageData`
 * directly, which needs numbers rather than a `fillStyle` string. An unparseable string resolves
 * to opaque black rather than throwing, so one bad colour can't blank a whole render.
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
