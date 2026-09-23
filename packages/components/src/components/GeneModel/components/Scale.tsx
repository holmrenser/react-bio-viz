import { computeAxisTicks, type LinearScale } from "@react-bio-viz/core";

const formatNumber = new Intl.NumberFormat().format;

const MAJOR_TICK = 6;
const MINOR_TICK = 3;
const FONT_SIZE = 10;

/** Approximate advance width of one digit/separator at {@link FONT_SIZE}, in pixels. */
const CHAR_WIDTH = 6;

/** Clear space to leave between two neighbouring labels. */
const LABEL_GAP = 16;

/**
 * Minimum pixel gap between labelled ticks, derived from how wide the longest label will actually
 * be. Genomic coordinates run to ten characters ("35,046,000"), so a fixed spacing tuned for short
 * labels puts them on top of each other; measuring the domain's own formatting avoids that at any
 * zoom level.
 */
function labelSpacing(domainMax: number): number {
  return formatNumber(Math.round(domainMax)).length * CHAR_WIDTH + LABEL_GAP;
}

function anchorFor(x: number, [left, right]: [number, number], halfLabel: number): "start" | "middle" | "end" {
  if (x - left < halfLabel) return "start";
  if (right - x < halfLabel) return "end";
  return "middle";
}

/**
 * A genomic-position ruler. Ticks land on round numbers via the shared nice-step ladder
 * (`computeAxisTicks`), so labels stay readable at any zoom instead of showing whatever an even
 * division of the visible span produces. Colored with `currentColor` so it follows the host theme.
 */
export function Scale({
  scale,
  transform,
  seqid,
  minSpacing,
}: {
  scale: LinearScale;
  transform: string;
  seqid: string;
  /** Overrides the label-width-derived minimum gap between labelled ticks. */
  minSpacing?: number;
}): JSX.Element {
  const range = scale.range();
  const domain = scale.domain();
  const spacing = minSpacing ?? labelSpacing(domain[1]);
  const ticks = computeAxisTicks({ domain, range, minSpacing: spacing });
  const halfLabel = (spacing - LABEL_GAP) / 2;

  return (
    <g transform={transform} className="text-foreground" fill="currentColor" stroke="currentColor">
      <line x1={range[0]} x2={range[1]} y1={5} y2={5} strokeWidth={1} opacity={0.6} />
      {ticks.map((tick) => {
        const isMajor = tick.label !== null;
        return (
          <g key={tick.value}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={5 - (isMajor ? MAJOR_TICK : MINOR_TICK)}
              y2={5}
              strokeWidth={1}
              opacity={isMajor ? 0.6 : 0.3}
            />
            {isMajor && (
              <text
                x={tick.x}
                y={5 - MAJOR_TICK - 3}
                textAnchor={anchorFor(tick.x, range, halfLabel)}
                fontSize={FONT_SIZE}
                stroke="none"
                opacity={0.75}
              >
                {formatNumber(tick.label!)}
              </text>
            )}
          </g>
        );
      })}
      <text x={range[0]} y={20} textAnchor="start" fontSize={11} stroke="none" opacity={0.75}>
        {seqid}
      </text>
    </g>
  );
}
