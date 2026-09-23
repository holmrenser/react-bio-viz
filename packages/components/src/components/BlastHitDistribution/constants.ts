import type { BlastMetric } from "./types";

/** Vertical space one row of stacked hits occupies. */
export const HIT_ROW_HEIGHT = 16;

/** Height of the hit bars drawn within a row. */
export const HIT_HEIGHT = 12;

export const MARGIN = { top: 20, right: 10, bottom: 10, left: 10 } as const;

/** Height reserved for the query-coordinate ruler. */
export const SCALE_HEIGHT = 24;

/** Stroke width of a selected hit's outline. */
export const SELECTED_STROKE_WIDTH = 2;

export const METRICS: BlastMetric[] = ["evalue", "bitScore", "percentIdentity"];

export const DEFAULT_METRIC: BlastMetric = "evalue";
