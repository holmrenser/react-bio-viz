import type { LinearScale } from "./linearScale";
import { computeAxisTicks } from "./ticks";

const formatNumber = new Intl.NumberFormat().format;

/** Baseline of the ruler within its own coordinate system. */
const BASELINE = 5;
const MAJOR_TICK = 6;
const MINOR_TICK = 3;
const FONT_SIZE = 10;
/** Approximate advance width of one digit or separator at {@link FONT_SIZE}, in pixels. */
const CHAR_WIDTH = 6;
/** Clear space between two neighbouring labels. */
const LABEL_GAP = 16;

/** Tick spacing that fits the widest label: coordinates run to ten characters ("35,046,000"). */
function labelSpacing(domainMax: number): number {
  return formatNumber(Math.round(domainMax)).length * CHAR_WIDTH + LABEL_GAP;
}

function anchorFor(x: number, [left, right]: [number, number], halfLabel: number): "start" | "middle" | "end" {
  if (x - left < halfLabel) return "start";
  if (right - x < halfLabel) return "end";
  return "middle";
}

/** @public */
export interface AxisRulerProps {
  /** Data coordinate → pixel x; its range is the ruler's extent. */
  scale: LinearScale;
  transform?: string;
  /** Text under the ruler's left end, e.g. the sequence name. */
  label?: string;
  /** Minimum pixel gap between labelled ticks. Defaults to the width of the widest label. */
  minSpacing?: number;
}

/**
 * @public
 * An SVG position ruler with ticks on round numbers at any zoom (via {@link computeAxisTicks}).
 * Drawn in `currentColor`, so it follows the host theme.
 */
export function AxisRuler({ scale, transform, label, minSpacing }: AxisRulerProps) {
  const range = scale.range();
  const domain = scale.domain();
  const spacing = minSpacing ?? labelSpacing(domain[1]);
  const ticks = computeAxisTicks({ domain, range, minSpacing: spacing });
  const halfLabel = (spacing - LABEL_GAP) / 2;

  return (
    <g transform={transform} fill="currentColor" stroke="currentColor">
      <line x1={range[0]} x2={range[1]} y1={BASELINE} y2={BASELINE} strokeWidth={1} opacity={0.6} />
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={tick.x}
            x2={tick.x}
            y1={BASELINE - (tick.label !== null ? MAJOR_TICK : MINOR_TICK)}
            y2={BASELINE}
            strokeWidth={1}
            opacity={tick.label !== null ? 0.6 : 0.3}
          />
          {tick.label !== null && (
            <text
              x={tick.x}
              y={BASELINE - MAJOR_TICK - 3}
              textAnchor={anchorFor(tick.x, range, halfLabel)}
              fontSize={FONT_SIZE}
              stroke="none"
              opacity={0.75}
            >
              {formatNumber(tick.label)}
            </text>
          )}
        </g>
      ))}
      {label && (
        <text x={range[0]} y={20} textAnchor="start" fontSize={11} stroke="none" opacity={0.75}>
          {label}
        </text>
      )}
    </g>
  );
}
