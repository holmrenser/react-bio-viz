/**
 * The display order as indices into `msa`: `order`'s ids first (unknown ids ignored), then any rows
 * `order` doesn't mention, in their original order. So a stale or partial order — e.g. a tree's
 * leaf order that lacks some sequences — degrades gracefully instead of hiding rows.
 */
export function resolveRowOrder(rowIds: readonly string[], order: readonly string[] | undefined): number[] {
  if (!order || order.length === 0) return rowIds.map((_, index) => index);
  const indexById = new Map<string, number>();
  rowIds.forEach((id, index) => {
    if (!indexById.has(id)) indexById.set(id, index);
  });
  const seen = new Set<number>();
  const result: number[] = [];
  for (const id of order) {
    const index = indexById.get(id);
    if (index !== undefined && !seen.has(index)) {
      seen.add(index);
      result.push(index);
    }
  }
  rowIds.forEach((_, index) => {
    if (!seen.has(index)) result.push(index);
  });
  return result;
}

/** A copy of `items` with the element at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
