import type { DistanceColorScheme } from "../types";

/** @public The heatmap fill for a distance scaled to 0–1 (acacia's palettes). */
export function distanceColor(intensity: number, scheme: DistanceColorScheme): [number, number, number] {
  const t = Math.max(0, Math.min(1, Number.isFinite(intensity) ? intensity : 0));
  const full = (k: number) => Math.round(255 * (1 - t * k));
  switch (scheme) {
    case "cool":
      return [full(1), full(1), full(0.6)];
    case "green":
      return [full(1), full(0.6), full(1)];
    case "grayscale":
      return [full(1), full(1), full(1)];
    case "warm":
    default:
      return [full(0.6), full(1), full(1)];
  }
}

/** Black or white, whichever reads better on `rgb` (WCAG relative luminance). */
export function contrastText([r, g, b]: [number, number, number]): string {
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

/** Largest off-diagonal value, for scaling colours; 0 for an empty or all-zero matrix. */
export function maxDistance(matrix: readonly (readonly number[])[]): number {
  let max = 0;
  matrix.forEach((row, i) =>
    row.forEach((value, j) => {
      if (i !== j && Number.isFinite(value) && value > max) max = value;
    })
  );
  return max;
}
