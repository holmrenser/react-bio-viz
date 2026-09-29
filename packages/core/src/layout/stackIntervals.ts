/** @public The minimum shape {@link stackIntervals} needs from an interval-like item. */
export interface IntervalLike {
  id: string;
  start: number;
  end: number;
}

/**
 * @public
 * Assigns each interval a 0-based row so that no two intervals in a row overlap: greedily, in order
 * of start position, each goes into the first row that is free by then. Deterministic regardless of
 * input order.
 */
export function stackIntervals<T extends IntervalLike>(intervals: T[]): Map<string, number> {
  const rows: number[] = []; // rows[i] = end position of the last interval placed in row i
  const assignment = new Map<string, number>();

  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  for (const interval of sorted) {
    let row = rows.findIndex((rowEnd) => rowEnd <= interval.start);
    if (row === -1) {
      row = rows.length;
      rows.push(interval.end);
    } else {
      rows[row] = interval.end;
    }
    assignment.set(interval.id, row);
  }

  return assignment;
}

/** @public How many rows {@link stackIntervals} used — the minimum lane count needed to avoid overlap. */
export function countIntervalRows<T extends IntervalLike>(intervals: T[]): number {
  const assignment = stackIntervals(intervals);
  let max = -1;
  for (const row of assignment.values()) max = Math.max(max, row);
  return max + 1;
}
