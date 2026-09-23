import type { BlastHit, BlastMetric } from "../types";

/** Raw value of `hit` along `metric`, in its natural units. */
export function metricValue(hit: BlastHit, metric: BlastMetric): number {
  switch (metric) {
    case "evalue":
      return hit.evalue;
    case "bitScore":
      return hit.bitScore;
    case "percentIdentity":
      return hit.percentIdentity;
  }
}

/**
 * A "higher is better" transform of `metricValue`, so the color scale can treat every metric the
 * same way regardless of orientation: bitScore/percentIdentity are already higher-is-better,
 * while evalue is the opposite (lower is a stronger hit), so it's negated log-space instead.
 */
export function metricScore(hit: BlastHit, metric: BlastMetric): number {
  const value = metricValue(hit, metric);
  if (metric === "evalue") {
    return -Math.log10(Math.max(value, Number.MIN_VALUE));
  }
  return value;
}

export function metricLabel(metric: BlastMetric): string {
  switch (metric) {
    case "evalue":
      return "E-value";
    case "bitScore":
      return "Bit score";
    case "percentIdentity":
      return "% Identity";
  }
}

export function formatMetricValue(hit: BlastHit, metric: BlastMetric): string {
  const value = metricValue(hit, metric);
  switch (metric) {
    case "evalue":
      return value.toExponential(2);
    case "bitScore":
      return value.toFixed(1);
    case "percentIdentity":
      return `${value.toFixed(1)}%`;
  }
}
