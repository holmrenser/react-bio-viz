import type { MSASelection } from "../types";

/** @public How a gesture combines with the existing selection: plain, Shift, or Cmd/Ctrl. */
export type SelectionMode = "replace" | "additive" | "toggle";

/** The mode a pointer gesture's modifier keys ask for (Shift adds, Cmd/Ctrl toggles). */
export function selectionModeFor(event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): SelectionMode {
  if (event.shiftKey) return "additive";
  if (event.metaKey || event.ctrlKey) return "toggle";
  return "replace";
}

/** Applies `range` to `previous` under `mode`, preserving first-seen order. */
export function applySelectionMode<T>(previous: readonly T[], range: readonly T[], mode: SelectionMode): T[] {
  if (mode === "replace") return [...new Set(range)];
  const next = new Set(previous);
  for (const item of range) {
    if (mode === "additive") next.add(item);
    else if (next.has(item)) next.delete(item);
    else next.add(item);
  }
  return [...next];
}

/** Inclusive integer range between two indices, in either order. */
export function indexRange(a: number, b: number): number[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** @public The empty selection. */
export const EMPTY_SELECTION: MSASelection = { rows: [], columns: [] };

/**
 * Drops selected rows/columns that no longer exist (after the alignment was edited), returning the
 * same object when nothing changed so a controlled parent isn't sent a no-op update.
 */
export function pruneSelection(selection: MSASelection, rowIds: ReadonlySet<string>, columnCount: number): MSASelection {
  const rows = selection.rows.filter((id) => rowIds.has(id));
  const columns = selection.columns.filter((col) => col >= 0 && col < columnCount);
  if (rows.length === selection.rows.length && columns.length === selection.columns.length) return selection;
  return { rows, columns };
}
