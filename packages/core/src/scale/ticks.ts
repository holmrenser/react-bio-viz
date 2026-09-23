/**
 * A "nice" step ladder — every step divides evenly into the next one that is a multiple of it, so
 * minor ticks always land on a whole number of units.
 */
const STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];

/** Minimum horizontal room a labelled tick needs before labels start to collide, in CSS pixels. */
const DEFAULT_MIN_LABEL_SPACING = 64;

/** @public One tick on an axis. */
export interface Tick {
  /** Value in data space the tick sits on. */
  value: number;
  /** Pixel offset of the tick along the axis. */
  x: number;
  /** Label shown to the user; `null` on minor (unlabelled) ticks. */
  label: number | null;
}

/**
 * @public
 * Smallest "nice" step that keeps labelled ticks at least `minSpacing` pixels apart at the given
 * zoom level. Steps above the ladder's top are scaled by powers of ten rather than clamped, so
 * this stays sensible on genome-scale axes.
 */
export function pickTickStep(pixelsPerUnit: number, minSpacing = DEFAULT_MIN_LABEL_SPACING): number {
  if (!(pixelsPerUnit > 0)) return STEPS[STEPS.length - 1];
  for (const step of STEPS) {
    if (step * pixelsPerUnit >= minSpacing) return step;
  }
  // Past the ladder, keep multiplying the top entry by ten — the ladder's divisibility property
  // (each entry divides the next multiple of it) is preserved across decades.
  let step = STEPS[STEPS.length - 1];
  while (step * pixelsPerUnit < minSpacing && Number.isFinite(step)) step *= 10;
  return step;
}

const NICE_MULTIPLIERS = [1, 2, 5, 10];

/**
 * @public
 * Rounds `target` to the nearest "nice" 1/2/5×10ⁿ value — for a legend that should read as a round
 * number near some target size, such as the tree scale bar's branch-length I-beam. Distinct from
 * {@link pickTickStep}, which picks the smallest nice step at or above a minimum.
 */
export function pickNiceLength(target: number): number {
  if (!(target > 0)) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
  const candidates = NICE_MULTIPLIERS.map((m) => m * magnitude);
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best
  );
}

/** Minor ticks per major: 5 when the step divides by 5, else 2, else none. */
function minorStepFor(majorStep: number): number {
  const divisor = majorStep % 5 === 0 ? 5 : majorStep % 2 === 0 ? 2 : 1;
  return majorStep / divisor;
}

/**
 * @public
 * Ticks for the discrete columns currently visible in a panned/zoomed viewport — the MSA case,
 * where one unit is one column of fixed pixel width. Major ticks carry a 1-based label; minor
 * ticks (five per major where the step allows) do not. Positions are 1-based for the user, so the
 * label `50` sits on column index 49.
 */
export function computeColumnTicks({
  columnCount,
  width,
  offsetX,
  pixelsPerColumn,
  minSpacing = DEFAULT_MIN_LABEL_SPACING,
}: {
  columnCount: number;
  width: number;
  /** Pixel offset of column 0's left edge, relative to the viewport's left edge (usually ≤ 0). */
  offsetX: number;
  pixelsPerColumn: number;
  minSpacing?: number;
}): Tick[] {
  if (columnCount <= 0 || width <= 0 || pixelsPerColumn <= 0) return [];

  const majorStep = pickTickStep(pixelsPerColumn, minSpacing);
  // Every ladder entry above 1 divides by 5 or 2, and majors are always ≥ minSpacing apart, so
  // minors land no closer than ~1/5 of that — no extra spacing guard needed.
  const minorStep = minorStepFor(majorStep);

  const firstCol = Math.max(0, Math.floor(-offsetX / pixelsPerColumn));
  const lastCol = Math.min(columnCount - 1, Math.ceil((width - offsetX) / pixelsPerColumn));
  if (lastCol < firstCol) return [];

  // Walk 1-based positions on the minor grid, starting at the first multiple at or after the
  // leftmost visible column.
  const firstPos = Math.max(minorStep, Math.ceil((firstCol + 1) / minorStep) * minorStep);
  const ticks: Tick[] = [];
  for (let pos = firstPos; pos <= lastCol + 1; pos += minorStep) {
    const col = pos - 1;
    ticks.push({
      value: col,
      x: col * pixelsPerColumn + pixelsPerColumn / 2 + offsetX,
      label: pos % majorStep === 0 ? pos : null,
    });
  }
  return ticks;
}

/**
 * @public
 * Ticks for a continuous axis (genomic coordinates, query positions) mapped onto a pixel range —
 * the GeneModel/GenomeBrowser/BlastHitDistribution case. Same "nice" step ladder as
 * {@link computeColumnTicks}, so every ruler in the library labels round numbers rather than
 * whatever an even division of the visible span happens to produce.
 */
export function computeAxisTicks({
  domain,
  range,
  minSpacing = DEFAULT_MIN_LABEL_SPACING,
  includeMinor = true,
}: {
  domain: [number, number];
  range: [number, number];
  minSpacing?: number;
  /** Emit unlabelled minor ticks between the labelled ones. @defaultValue true */
  includeMinor?: boolean;
}): Tick[] {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const pixels = r1 - r0;
  if (!(span > 0) || !(Math.abs(pixels) > 0)) return [];

  const pixelsPerUnit = Math.abs(pixels) / span;
  const majorStep = pickTickStep(pixelsPerUnit, minSpacing);
  const step = includeMinor ? minorStepFor(majorStep) : majorStep;

  const first = Math.ceil(d0 / step) * step;
  const ticks: Tick[] = [];
  // Guard against a pathological step/span ratio producing an unbounded loop.
  const maxTicks = Math.ceil(span / step) + 2;
  for (let i = 0, value = first; value <= d1 && i < maxTicks; i += 1, value = first + i * step) {
    const t = (value - d0) / span;
    // Floating-point drift makes `value % majorStep === 0` unreliable on fractional steps, so
    // compare the rounded multiple instead.
    const isMajor = Math.abs(Math.round(value / majorStep) * majorStep - value) < step / 1000;
    ticks.push({ value, x: r0 + t * pixels, label: isMajor ? value : null });
  }
  return ticks;
}
